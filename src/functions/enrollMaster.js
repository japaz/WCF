const AWS = require("aws-sdk");
const chance = require("chance").Chance();
const sns = new AWS.SNS();
const epsagon = require("epsagon");
const middy = require("middy");
const { ssm } = require("middy/middlewares");

const { stage } = process.env;


const handler = epsagon.lambdaWrapper(async (event, context) => {
  epsagon.init({
    token: context.epsagonToken,
    appName: `${process.env.service}`,
    metadataOnly: false
  });

  console.log(event.body);
  const { masterId } = JSON.parse(event.body);
  const userEmail = event.requestContext.authorizer.claims.email;

  const orderId = chance.guid();
  console.log(`enrolling to master ${masterId} with order ID ${orderId}`);

  const data = {
    orderId,
    masterId,
    userEmail
  };

  const params = {
    Message: JSON.stringify(data),
    TopicArn: process.env.enrollMasterSnsTopic
  };

  await sns.publish(params).promise();

  console.log(`published 'master_enrolled' event into Kinesis`);

  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({ orderId })
  };

  return response;
});

module.exports.handler = middy(handler).use(
  ssm({
    cache: true,
    cacheExpiryInMillis: 3 * 60 * 1000,
    setToContext: true,
    names: {
      epsagonToken: `/pufouniversity/${stage}/epsagonTokenSecure`
    }
  })
);
