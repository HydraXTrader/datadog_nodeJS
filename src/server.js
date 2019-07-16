import HydraX from './hydraX'
import uuidv4 from 'uuid/v4'
var app = require('express')()
var server = require('http').Server(app);
var io = require('socket.io')(server, { 
    serveClient: false,
    pingTimeout: 60000 
});

var port = 80
server.listen(port);

var HydraXInstance = new HydraX()

io.on('connection', client => {

    const user_id = uuidv4()
    client.user_id = user_id

    client.on('main', async (message) => {
        switch(message.event) {
            case 'subscribe-orderbook':
                HydraXInstance.subscribe_binance_orderbook(message.full_instrument, e=>{
                    client.emit('orderbook:'+message.full_instrument, e)
                })
            break
        }
    })
    
    client.on('disconnect', (reason) => {
        ///logger.info("Disconnected -> " + JSON.stringify(reason))
        delete client.HydraClient  
    })
    client.on('error', (error) => {
//logger.info("Error -> " + JSON.stringify(error))
      });
})
