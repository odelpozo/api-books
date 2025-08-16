require("dotenv").config();
const { ServiceBroker } = require("moleculer");
const ApiGateway = require("moleculer-web");

const broker = new ServiceBroker({ logger: true, logLevel: "info", requestTimeout: 30 * 1000 });

broker.createService({
    name: "api",
    mixins: [ApiGateway],
    settings: {
        port: process.env.PORT || 3002,
        routes: [{
            path: "/api",
            cors: {
                origin: ['https://tu-app.vercel.app'],
                methods: ['GET', 'POST', 'PUT', 'DELETE'],
                credentials: false
            },
            bodyParsers: {
                json: { strict: false, limit: "10mb" },
                urlencoded: { extended: true, limit: "10mb" }
            },
            aliases: {
                "GET books/search": "books.search",
                "GET books/last-search": "books.lastSearch",
                "POST books/my-library": "books.create",
                "GET books/my-library": "books.list",
                "GET books/my-library/:id": "books.get",
                "PUT books/my-library/:id": "books.update",
                "DELETE books/my-library/:id": "books.remove",
                "GET books/library/front-cover/:id": "books.frontCover",
                "GET healthz": "health.healthz",
                "GET readyz": "health.readyz"
            }
        }]
    }
});

broker.loadServices("./services");
broker.start().then(() => broker.logger.info("API escuchando en el puerto", process.env.PORT || 3002));
