Figuring out how many ec2 instances you have running in different AWS regions, can be a
tedious task:
- In aws console you have to change the active region and click around
- In cli you have to issue an `aws ec2 describe-intances` command for each region

Lets enter **ChatOps** this repo contains a hipchat-bot, which can responds to
the `/ec2` command by listing ec2 instance across reagions:

![alt text](https://github.com/lalyos/hipchat-lambda/raw/master/img/hipchat-bot.png "Hipchat bot")

This hipchat bot doesn't need any server as its run's as **AWS:Lambda** function.

## Installation

Hipchat recognise [2 types of integrations](https://confluence.atlassian.com/hc/integrations-with-hipchat-server-683508267.html):
- **global** integration/webhook
- **per-room** integration/webhook

Right now its a **per-room** soultion, which is easier to implement, but you have to deploy yourself the backend.
There is a plan to make it a **global** solution, which would mean no AWS deployment is required, but that programming model
is more complicated, so left as a lower priority task.

The installation Overview is:
- first create a hipchat room
- create per-room integration token, save it in .profile
- deploy the backend (AWS lambda+api gateway wrapped as a cloudformation)
- add a per-room command to hipchat integration, which will post to the lambda backend

### Create HipChat per-room token

You will need to create a room, so that you have owner rights on it.

- Got to [My Rooms](https://hipchat.hortonworks.com/rooms?t=mine) and select the newly created room.
- Select **Integrations** / **Find New** and choose **Build Your Own** by clicking **create**
- Name your bot as you wish, like **ec2-bot** and click **create**
- Click on **Try It**, and you will see a green message in the room.

Collect roomId and token from the sample **Send messages to this room by**
Create a `.profile` file and source it: `source .profile`

```
export HIPCHAT_ROOM_ID=1234567
export HIPCHAT_TOKEN=12345678123456781234567812345678
```

### Deploy the backend

```
make create-stack
```

It will Create a Lambda-based Application, using the new simplified method called:
[AWS Serverless Application Model (AWS SAM)](http://docs.aws.amazon.com/lambda/latest/dg/deploying-lambda-apps.html#serverless_app)


If you are interested these are the actual api calls:

- `aws cloudformation create-change-set --change-set-type CREATE`
- `aws cloudformation wait change-set-create-complete`
- `aws cloudformation execute-change-set`
- `aws cloudformation wait stack-create-complete`


By default the lambda timeout is to short (3 sec), so make it to 30 sec:
```
make update-lambda-timeout
```
 
### Create a room command

- Select the **Add a command** checkbox
- Enter a command like `/ec2`
- Enter a placeholder url, which will be replaced later
## Local test

There is a Docker image **lambci/lambda** which mimics lambda functionality in a container.

```
make docker-test
```
To give aws credentials to the lambda fn locally set the ususal environment variables:
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_DEFAULT_REGION

What it does in the background:
```
docker run \
		-e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
		-e AWS_DEFAULT_REGION=$AWS_DEFAULT_REGION \
		-e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
		-v $PWD:/var/task \
		lambci/lambda hipchat.handler
```

```
make docker-test
```
## tl;dr

sample json from hipchat:
```
{
  "event": "room_message",
  "item": {
    "message": {
      "date": "2017-01-10T14:21:12.466497+00:00",
      "from": {
        "id": /999999,
        "links": {
          "self": "https://api.hipchat.com/v2/user/999999"
        },
        "mention_name": "LajosPapp",
        "name": "Lajos Papp",
        "version": "00000000"
      },
      "id": "78a790bf-3239-42c3-0000-123412345678",
      "mentions": [],
      "message": "/ec2",
      "type": "message"
    },
    "room": {
      "id": 1234567,
      "is_archived": false,
      "links": {
        "members": "https://api.hipchat.com/v2/room/1234567/member",
        "participants": "https://api.hipchat.com/v2/room/1234567/participant",
        "self": "https://api.hipchat.com/v2/room/1234567",
        "webhooks": "https://api.hipchat.com/v2/room/1234567/webhook"
      },
      "name": "mybot",
      "privacy": "private",
      "version": "F424UCL8"
    }
  },
  "oauth_client_id": "60ddcda8-3bed-436f-0000-123456781234",
  "webhook_id": 12345678
}

```

