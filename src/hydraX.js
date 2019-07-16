import redis from 'redis'
import binance from './binance'
export default class HydraX {
    constructor() {
        this.redis_sub = redis.createClient()
    }

    /**
     * Subscribe to binance orderbook for a given instrument
     * @param {*} full_instrument : string containing the name of the exchange and a symbol in lower case
     * i.e: binance:eth/btc, binance:ltc/btc, binance:xrp/btc...
     * @param {*} callback : callback to send data to client
     */
    subscribe_binance_orderbook(full_instrument, callback) {    
        //create new binance objecj 
        let binance_exchange = new binance()
        //open subscription
        binance_exchange.subscribe_orderbook(full_instrument)
        
        //suscbribe to redis event corresponding to the requested market data (ie:orderbook:binance:eth/btc)
        this.redis_sub.subscribe('orderbook:'+full_instrument)

        //when message receive from redis, send the message to client using callback
        this.redis_sub.on("message", (channel, redis_message) => {
            if(channel.includes('orderbook:'+full_instrument))
                callback(JSON.parse(redis_message))
        })

    }   


}