const amqp = require("amqplib");
const myLogger = require("./logger");

let connection = null;
let channel = null;

const EXCHANGE_NAME = "facebook_events";
const RABBITMQ_URL = process.env.RABBITMQ_URL;

async function connectRabbitMQ() {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    myLogger.info("Connected to Rabbit MQ");
    return channel;
  } catch (e) {
    myLogger.error("Error connecting to rabbit mq", e);
  }
}

async function publishEvent(routingKey, message) {
  //we need to pass a key and a message (to be published)
  if (!channel) {
    await connectRabbitMQ();
  }

  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message))
  );
  myLogger.info(`Event published: ${routingKey}`);
}

module.exports = { connectRabbitMQ, publishEvent };
