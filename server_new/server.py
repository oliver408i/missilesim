import bottle, json, uuid, random, threading, time, math
import bottle.ext.websocket as websocket

app = bottle.Bottle()

players = {}
projectiles = {}
terrainData = []

def tick(players, projectiles):
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
                for playerId, player in players.items():
                    player_pos = player['location']
                    for projId, projectile in list(projectiles.items()):
                        proj_pos = projectile['location']
                        # Simple collision detection: check if the projectile is within 1 unit of the player
                        if (player['id'] != projectile['owner'] and
                            abs(player_pos[0] - proj_pos[0]) <= 1 and
                            abs(player_pos[1] - proj_pos[1]) <= 1 and
                            abs(player_pos[2] - proj_pos[2]) <= 1):
                            # Handle collision
                            dist = math.sqrt(sum((a - b) ** 2 for a, b in zip(player_pos, proj_pos)))
                            player['health'] -= max(5, int(40 - dist))
                            del projectiles[projId]  # Remove projectile after collision
                            continue
                if projectiles[i]['lifetime'] < 0:
                    del projectiles[i]
        time.sleep(0.01)

gameThread = threading.Thread(target=tick, daemon=True, args=(players, projectiles))
gameThread.start()



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
            thisId = str(uuid.uuid4())
            print("client joined", thisId)
            players[thisId] = {'id': thisId, 'name': data['name'], 'location': [0, 0, 0], 'rotation': [0, 0, 0], 'moveSpeed': random.randint(1, 20) * 0.01, 'health':100}

            if terrainData == []:
                print("using terrain data from this client", data['terrainType'], data['terrainSeed'])
                terrainData = [data['terrainType'], data['terrainSeed']]
                ws.send(json.dumps({'_type': 'id', 'id': thisId}))
            else:
                ws.send(json.dumps({'_type': 'id', 'id': thisId, 'terrainType': terrainData[0], 'terrainSeed': terrainData[1]}))


        
        elif data['_type'] == 'keyState':
            if players[thisId] is not None:
                players[thisId]['keyState'] = data['keyState']
        
        elif data['_type'] == 'fire':
            if players[thisId] is not None:
                bulletUuid = str(uuid.uuid4())
                projectiles[bulletUuid] = {'id': bulletUuid, '_type': 'bullet','owner': thisId, 'velocity': data['velocity'], 'location': data['location'], 'rotation': data['rotation'], 'lifetime': 5000}
        
        elif data['_type'] == 'updatePosition':
            if players[thisId] is not None:
                players[thisId]['location'] = data['location']
                players[thisId]['rotation'] = data['rotation']
        
        elif data['_type'] == "update":
            ws.send(json.dumps({'_type': 'update', 'players': players, 'projectiles': projectiles}))

    del players[thisId]
    print('connection closed')

app.run(host='0.0.0.0', port=3412, server=websocket.GeventWebSocketServer)