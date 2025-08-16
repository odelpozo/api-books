
const os = require("os");
const mongoose = require("mongoose");

function mongoStateToText(state) {
    return ({
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting"
    }[state] || "unknown");
}

module.exports = {
    name: "health",

    actions: {

        healthz: {
            async handler(ctx) {
                const now = Date.now();
                const upMs = process.uptime() * 1000;
                const mongoState = mongoose.connection?.readyState ?? 0;

                return {
                    status: "ok",
                    service: this.broker.nodeID,
                    time: new Date(now).toISOString(),
                    uptime_ms: upMs,
                    memory: process.memoryUsage(),
                    cpu_loadavg: os.loadavg(),
                    mongo: {
                        state: mongoStateToText(mongoState),
                        readyState: mongoState
                    }
                };
            }
        },


        readyz: {
            timeout: 2500,
            async handler(ctx) {
                const mongoState = mongoose.connection?.readyState ?? 0;


                if (mongoState !== 1) {
                    ctx.meta.$statusCode = 503;
                    return {
                        status: "degraded",
                        mongo: { state: mongoStateToText(mongoState), readyState: mongoState }
                    };
                }


                try {
                    await mongoose.connection.db.admin().ping();
                    return {
                        status: "ready",
                        mongo: { state: "connected", ready: true }
                    };
                } catch (err) {
                    ctx.meta.$statusCode = 503;
                    return {
                        status: "degraded",
                        mongo: { state: "connected", ready: false },
                        error: err.message
                    };
                }
            }
        }
    }
};
