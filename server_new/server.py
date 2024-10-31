import bottle, json, uuid, random, threading, time, math, three # type: ignore
import bottle.ext.websocket as websocket # type: ignore
import numpy as np, types

def convert_to_serializable(data):
    """Recursively converts numpy arrays and generators to JSON-serializable formats."""
    if isinstance(data, np.ndarray):
        return data.tolist()
    elif isinstance(data, dict):
        return {key: convert_to_serializable(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [convert_to_serializable(element) for element in data]
    elif isinstance(data, tuple):
        return tuple(convert_to_serializable(element) for element in data)
    elif isinstance(data, types.GeneratorType):
        return list(data)  # Convert generator to list
    return data  # Return data as is if it's already serializable

app = bottle.Bottle()

players = {}
projectiles = {}
terrainData = []
messages = []

def tick(players, projectiles, messages):
    while True:
        ikeys = list(projectiles.keys())
        for i in ikeys:
            if not i in projectiles: continue
            if projectiles[i]['_type'] == 'bullet':
                projectiles[i]['location'][0] += projectiles[i]['velocity'][0]
                projectiles[i]['location'][1] += projectiles[i]['velocity'][1]
                projectiles[i]['location'][2] += projectiles[i]['velocity'][2]
                projectiles[i]['lifetime'] -= 1

                # Check for collisions between players and projectiles
                for playerId, player in list(players.items()):  # Iterate over a copy of players to safely modify it
                    player_pos = player['location']
                    for projId in list(projectiles.keys()):  # Use list(projectiles.keys()) to iterate over a copy of the keys
                        projectile = projectiles[projId]
                        proj_pos = projectile['location']
                        # Simple collision detection: check if the projectile is within 1 unit of the player
                        if (player['id'] != projectile['owner'] and
                            abs(player_pos[0] - proj_pos[0]) <= 1 and
                            abs(player_pos[1] - proj_pos[1]) <= 1 and
                            abs(player_pos[2] - proj_pos[2]) <= 1):
                            # Handle collision
                            dist = math.sqrt(sum((a - b) ** 2 for a, b in zip(player_pos, proj_pos)))
                            dmg = max(1, int(10 - dist))
                            player['health'] -= dmg
                            del projectiles[projId]  # Remove projectile after collision
                            if player['health'] <= 0 and not 'dead' in player:
                                player['health'] = 0  # Prevent negative health
                                player['dead'] = True
                                messages.append({"for": projectile["owner"], "message": "Kill "+player['name'], "persistent": True})

                                print("kill by", projectile['owner'])
                            if dmg < 10:
                                messages.append({"for": projectile['owner'], "message": "Hit "+player['name'] +" for "+str(dmg)})
                            elif dmg < 20:
                                messages.append({"for": projectile['owner'], "message": "Critical hit "+player['name'] +" for "+str(dmg)})
                            break
            elif projectiles[i]['_type'] == 'missile':
                projectiles[i]['lifetime'] -= 1
                if not projectiles[i]['target'] in players: 
                    print("target", projectiles[i]['target'], "not found")
                    del projectiles[i]
                    break
                targetCoords = players[projectiles[i]['target']]['location']

                lifetime = projectiles[i]['lifetime']
                speed = 1 - 0.1 * math.sin(lifetime / 5000 * math.pi / 2)

                projectiles[i] = three.update_projectile(projectiles[i], targetCoords, 0.01,speed, 1)

                for playerId, player in list(players.items()):  # Iterate over a copy of players to safely modify it
                    player_pos = player['location']
                    if (player['id'] != projectiles[i]['owner'] and
                        abs(player_pos[0] - projectiles[i]['location'][0]) <= 4 and
                        abs(player_pos[1] - projectiles[i]['location'][1]) <= 4 and
                        abs(player_pos[2] - projectiles[i]['location'][2]) <= 4):
                        
                        player['health'] = 0
                        player['dead'] = True
                        messages.append({"for": projectiles[i]['owner'], "message": "Missile kill "+player['name'], "persistent": True})
                        print("missile kill by", projectiles[i]['owner'])
                        del projectiles[i]
                        break

                if not i in projectiles: continue
                if projectiles[i]['lifetime'] < 0:
                    del projectiles[i]
        
        for i in players:
            if players[i]['fireCooldown'] > 0:
                players[i]['fireCooldown'] -= 1
        time.sleep(0.01)

gameThread = threading.Thread(target=tick, daemon=True, args=(players, projectiles, messages))
gameThread.start()

FIRE_COOLDOWN = 20


@app.route('/ws', apply=[websocket.websocket])
def websocket_app(ws):
    global terrainData
    print('connection opened')
    thisId = None
    while True:
        msg = ws.receive()
        if msg is None:
            break
        try:
            data = json.loads(msg)
        except ValueError:
            print("client sent invalid json")
            continue

        if data['_type'] == 'join':
            if not data['name']:
                print("client sent empty name")
                return
            thisId = str(uuid.uuid4())
            print("client joined", thisId)
            players[thisId] = {'id': thisId, 'name': data['name'], 'location': [0, 0, 0], 'rotation': [0, 0, 0], 'moveSpeed': random.randint(1, 20) * 0.04, 'health':100, 'fireCooldown': FIRE_COOLDOWN}

            if terrainData == []:
                print("using terrain data from this client", data['terrainType'], data['terrainSeed'])
                terrainData = [data['terrainType'], data['terrainSeed']]
                ws.send(json.dumps({'_type': 'id', 'id': thisId}))
            else:
                ws.send(json.dumps({'_type': 'id', 'id': thisId, 'terrainType': terrainData[0], 'terrainSeed': terrainData[1]}))
            messages.append({"for": thisId, "message": "Welcome "+data['name']})
        
        elif data['_type'] == 'messages':
            # TODO: Test this
            latestMessage = None
            lastPersistentMessage = None
            for message in messages[:]:
                if message['for'] == thisId:
                    latestMessage = message
                    messages.remove(message)
                    if 'persistent' in message and message['persistent']:
                        print('persistent message', message)
                        lastPersistentMessage = message
            if latestMessage is not None and not lastPersistentMessage:
                print("Sending message", latestMessage)
                ws.send(json.dumps({'_type':'message', 'message': latestMessage}))
            if lastPersistentMessage is not None:
                print("Sending persistent message", lastPersistentMessage)
                ws.send(json.dumps({'_type':'message', 'message': lastPersistentMessage}))

            
            
        
        elif data['_type'] == 'keyState':
            if thisId in players:
                players[thisId]['keyState'] = data['keyState']
        
        elif data['_type'] == 'fire':
            if thisId in players:
                bulletUuid = str(uuid.uuid4())
                if players[thisId]['fireCooldown'] <= 0:
                    players[thisId]['fireCooldown'] = FIRE_COOLDOWN
                    v = three.calculate_velocity_from_quaternion(three.quaternion_from_tuple(data['quaternion']), 2)
                    projectiles[bulletUuid] = {'id': bulletUuid, '_type': 'bullet','owner': thisId, 'velocity': v, 'location': data['location'], 'rotation': data['rotation'], 'lifetime': 5000}
        
        elif data['_type'] == 'missileLaunch':
            if thisId in players:
                missileUuid = str(uuid.uuid4())
                if players[thisId]['fireCooldown'] <= 0:
                    players[thisId]['fireCooldown'] = FIRE_COOLDOWN
                    projectiles[missileUuid] = {'id': missileUuid, '_type': 'missile','owner': thisId, 'target': data['target'], 'location': data['location'], 'rotation': data['rotation'], 'lifetime': 5000}
        elif data['_type'] == 'updatePosition':
            if thisId in players:
                players[thisId]['location'] = data['location']
                players[thisId]['rotation'] = data['rotation']
        
        elif data['_type'] == "update":
            ws.send(json.dumps(convert_to_serializable({'_type': 'update', 'players': players, 'projectiles': projectiles})))

    if thisId in players:
        del players[thisId]
    print('connection closed')

app.run(host='0.0.0.0', port=3412, server=websocket.GeventWebSocketServer)