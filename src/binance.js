import redis from 'redis'
import ccxt from 'ccxt'
import WebSocket from 'ws'
import _ from 'lodash'

export default class binance { 
    constructor() {
        this.orderbook = {}
        this.ccxt_binance = new ccxt.binance()
        // Websocket Endpoint
        this.stream_end_point = "wss://stream.binance.com:9443";
        this.redis_pub = redis.createClient()
    }

    /**
     * Enable to create and update a orderbook for an intrument
     * 2 steps: 
     *   1) creation of a complete orderbook using a REST request ussing CCXT library 
     *   2) updating of the orderbook using real-time data receive using WebSocket
     *  
     * @param {*} full_instrument : string containing the name of the exchange and a symbol in lower case
     * i.e: binance:eth/btc, binance:ltc/btc, binance:xrp/btc...
     */
    async subscribe_orderbook(full_instrument) {
        try { 

        
            let symbol_stream = full_instrument.split(':')[1].toLowerCase().replace('/', '')
            let symbol_ccxt = full_instrument.toUpperCase().split(':')[1]
            let symbol_hydrax_API = full_instrument.toUpperCase().split(':')[1]

            //first step: creation of the orderbook
            if(this.orderbook[symbol_hydrax_API] === undefined) {
                //fetch data
                let snapshot_data =  await this.ccxt_binance.fetchOrderBook(symbol_ccxt)
            
                //parse result and create the orderbook
                let initial_order = this.create_orderbook_from_snapshot(symbol_hydrax_API, snapshot_data)
                //send the result to redis on the channel 'orderbook:binance:' + symbol (i.e: orderbook:binance:eth/btc)
                this.redis_pub.publish('orderbook:'+full_instrument, JSON.stringify(initial_order))
            } 

            let socket = new WebSocket(this.stream_end_point+"/ws/"+symbol_stream+"@depth")
            
            socket.on('open', (e) => {
                console.log('connection open') //use datadog
              
                socket.on('message', event => {
                   // console.log(event)
                    let updated_orderbook = this.update_orderbook(symbol_hydrax_API, event)
                    if (updated_orderbook !== "NONE") 
                        this.redis_pub.publish('orderbook:'+full_instrument, JSON.stringify(updated_orderbook))
                })
            })
            socket.on('close', () => {
                console.log('connection closed')
            })
            socket.on('error', (e) => {
                console.log(e)
            })

        } catch(e) {
            console.log(e)
        }
        
        

    }

    create_orderbook_from_snapshot(symbol, data){
      
        let snapbid = data['bids']
        let snapask = data['asks']

        this.orderbook[symbol] = {bid: [], ask: []}

        for(let b of snapbid){
            this.orderbook[symbol].bid.push({
                price: +b[0],
                quantity: +b[1]
            })
        }


        for(let a of snapask){
            this.orderbook[symbol].ask.push({
                price: +a[0],
                quantity: +a[1]
            })
        }

        let result =  {
            exchange: 'binance',
            symbol: symbol,
            bid: this.orderbook[symbol].bid.slice(0,20),
            ask: this.orderbook[symbol].ask.slice(0,20)
        }
        return result
    }


    update_orderbook(symbol, data){
        data = JSON.parse(data)
        if(data.e === "depthUpdate" && this.orderbook[symbol]!==undefined){
            let bidArray = [];
            let askArray = [];
    
            for(const item in data.b){
                bidArray.push({
                    price: +data.b[item][0],
                    quantity: +data.b[item][1]
                }); //price, quantity
            }
    
            for(const item in data.a){
                askArray.push({
                    price: +data.a[item][0],
                    quantity: +data.a[item][1]
                });
            }   
          
            try {
            //    if(this.orderbook[symbol]!==undefined)
                    this.orderbook[symbol] = this.compute_new_orderbook(askArray, bidArray, this.orderbook[symbol])
                    return {
                        exchange: 'binance',
                        symbol: symbol,
                        bid: this.orderbook[symbol].bid.slice(0,20), //only send 20 row
                        ask: this.orderbook[symbol].ask.slice(0,20) // only send 20 row
                    }
                
            } catch(e) {
                console.log(e)
            }
        }
        return "NONE"
    }



        
    /**
     * This method enables to update a full orderbook (this.orderbook/this.orderbook property) of an exchange_connector
     * @param {*} ask_array : array of new ask info to add -> [{price: , quantity: }, {price: , quantity: }.....]
     * @param {*} bid_array : array of new bid info to add -> [{price: , quantity: }, {price: , quantity: }.....]
     * @param {*} book : complete orderbook
     */
    compute_new_orderbook(ask_array, bid_array, book) {
        let updated_orderbook = book
        if(ask_array.length>0) {
            for(let aa of ask_array){
                if(aa.quantity === 0) {
                    let index = updated_orderbook.ask.findIndex(row =>row.price === aa.price )
                    updated_orderbook.ask.splice(index,1)
                } else {
                    let index = updated_orderbook.ask.findIndex(row =>row.price === aa.price )
                    if(index !== -1) {
                        updated_orderbook.ask[index].quantity = aa.quantity
                    } else {
                        updated_orderbook.ask.push(aa)
                    }
                }
            }
        } 
        if (bid_array.length > 0) {
            for(let bb of bid_array){
                if(bb.quantity === 0) {
                    let index = updated_orderbook.bid.findIndex(row =>row.price ===bb.price )
                    updated_orderbook.bid.splice(index,1)
                } else {
                let index = updated_orderbook.bid.findIndex(row =>row.price === bb.price )
                    if(index !== -1) {
                        updated_orderbook.bid[index].quantity = bb.quantity
                    } else {
                        updated_orderbook.bid.push(bb)
                        // update rrtrackign odne on client side
                    }
                }
            }
        }

        updated_orderbook.bid=_.orderBy(updated_orderbook.bid, "price","desc");
        updated_orderbook.ask=_.orderBy(updated_orderbook.ask, "price");

        return updated_orderbook
    }


}