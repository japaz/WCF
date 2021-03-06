const AWS = require("aws-sdk");

const dynamodb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.mastersTable;
const epsagon = require("epsagon");
const middy = require("middy");
const { ssm } = require("middy/middlewares");

const { stage } = process.env;

console.log(`TableName: ${tableName} | stage: ${stage}`);

const handler = epsagon.lambdaWrapper(async (event, context) => {
  const count = 8;

  epsagon.init({
    token: context.epsagonToken,
    appName: `${process.env.service}`,
    metadataOnly: false
  });

  const req = {
    TableName: tableName,
    Limit: count
  };

  console.log(`Req: ${req}`)

  const resp = await dynamodb.scan(req).promise();

  console.log(`Resp: ${resp}`)

  const res = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(resp.Items)
  };

  return res;
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
