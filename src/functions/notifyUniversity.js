/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const AWS = require("aws-sdk");
const ses = new AWS.SES();
const { emailAddress } = process.env;
const epsagon = require("epsagon");
const middy = require("middy");
const { ssm } = require("middy/middlewares");

const { stage } = process.env;

function generateEmail(orderId, masterId, userEmail) {
  return {
    Source: emailAddress,
    Destination: { ToAddresses: [emailAddress] },
    ReplyToAddresses: [emailAddress],
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: `User with email ${userEmail} has enrolled to master ${masterId} with order id ${orderId}`
        }
      },
      Subject: {
        Charset: "UTF-8",
        Data: `[PufoUniversity] new enrollment`
      }
    }
  };
}

const handler = epsagon.lambdaWrapper(async (event, context) => {
  epsagon.init({
    token: context.epsagonToken,
    appName: `${process.env.service}`,
    metadataOnly: false
  });

  const orderPlaced = JSON.parse(event.Records[0].Sns.Message);
  console.log(orderPlaced);

  const emailParams = generateEmail(orderPlaced.orderId, orderPlaced.masterId, orderPlaced.userEmail);
  await ses.sendEmail(emailParams).promise();

  console.log(
    `notified universtity of order [${orderPlaced.orderId}] for master [${
      orderPlaced.masterId
    }]`
  );

  return "all done";
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
