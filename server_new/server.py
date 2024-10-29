import bottle, json, uuid, random
import bottle.ext.websocket as websocket

app = bottle.Bottle()

players = {}
terrainData = []

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
            players[thisId] = {'id': thisId, 'name': data['name'], 'location': [0, 0, 0], 'rotation': [0, 0, 0], 'moveSpeed': random.randint(1, 20) * 0.01}

            if terrainData == []:
                print("using terrain data from this client", data['terrainType'], data['terrainSeed'])
                terrainData = [data['terrainType'], data['terrainSeed']]
                ws.send(json.dumps({'_type': 'id', 'id': thisId}))
            else:
                ws.send(json.dumps({'_type': 'id', 'id': thisId, 'terrainType': terrainData[0], 'terrainSeed': terrainData[1]}))


        
        elif data['_type'] == 'keyState':
            if players[thisId] is not None:
                players[thisId]['keyState'] = data['keyState']
        
        elif data['_type'] == 'updatePosition':
            if players[thisId] is not None:
                players[thisId]['location'] = data['location']
                players[thisId]['rotation'] = data['rotation']
        
        elif data['_type'] == "update":
            ws.send(json.dumps({'_type': 'update', 'players': players}))

    del players[thisId]
    print('connection closed')

app.run(host='0.0.0.0', port=3412, server=websocket.GeventWebSocketServer)