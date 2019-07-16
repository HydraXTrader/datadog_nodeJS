# Datadog on a nodeJS project

This repository is a simple nodeJS project which will be use to test the integration of **Datadog** features.
The goal is to understand **how to instrument** a JS code to collects **logs**, **metrics** and **traces** (APM) on a **nodeJS project** which use the following technologies:  
* express
* socket-io
* redis
* REST requests
* aynchronous function using async/await

#### Decription of the repository
This repo is an example of an express server that manages requests of clients that wants to get **orderbook** data of **Binance** crypto-currency exchange.

If a client wants to get orderbook data for the instrument BTC/USD on Binance exchange,he connects to the express server and sends a request for this info. 
The code will proceed the request and call the corresponding method of **Binance API**, parse the data received and send the data to the client.

This repository is composed of 3 main files: 
* `./src/server.js`
This file enables to create an express server and to manage client requests
* `./src/binance.js`
This file is a binance object that enables to create REST request and open WebSocket conenction with Binance API
* `./src/hydraX.js`
This file is a HydraX object which enables to correctly cdkjgwje + redis listener to create a binance object and to call methods of this object (subscribe to orderbook data) 

`client1.html` and `client2.html` are 2 files which enable to simulate a client requesting for orderbook on binance

The flow of data is the following: 
1. Client send a request for an **orderbook** on **Binance** for the instrument** LTC/BTC **
2. The request is catch on `server.js`  
3. `server.js` calls `subscribe_binance_orderbook()` method of HydraX object
4. `HydraX` object create a `binance` object and calls `subscribe_orderbook()` to start collecting data from binance
In the meantime, using `redis`, `HydraX` subscribes to an event `orderbook:binance:ltc/btc`
5. Using `binance` object, we call Binance API and request for the orderbook of the instrument LTC/BTC
6. When orderbook data are received and parsed, `binance` object publishes the result to redis using the channel `orderbook:binance:ltc/btc`
7. The update will be catch by `HydraX` object thanks to the subscription to the orderbook event done at step 4
8. The info is send to client using a callback

## Set up 
#### Requirements:
* nodeJS > 8
* Redis server
* yarn (required for redis)

#### How to run:
* run a redis-server
* download or clone the repo
* yarn install 
* yarn run server
* open `client1.html` and/or `client2.html` on a browser and open the console of the browser to see the results







  