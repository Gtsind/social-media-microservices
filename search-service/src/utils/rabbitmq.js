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

async function consumeEvent(routingKey, callback) {
  if (!channel) {
    await connectRabbitMQ();
  }

  const q = await channel.assertQueue("", { exclusive: true });

  await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey);
  channel.consume(q.queue, (msg) => {
    if (msg !== null) {
      const content = JSON.parse(msg.content.toString());
      callback(content);
      channel.ack(msg);
    }
  });

  myLogger.info(`Subscribed to event: ${routingKey}`);
}

module.exports = { connectRabbitMQ, consumeEvent };
