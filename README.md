Figuring out how many ec2 instances you have running in different AWS regions, can be a
tedious task:
- In aws console you have to change the active region and click around
- In cli you have to issue an `aws ec2 describe-intances` command for each region

Lets enter **ChatOps** this repo contains a hipchat-bot, which can responds to
the `/ec2` command by listing ec2 instance across reagions:

![alt text](https://github.com/lalyos/hipchat-lambda/raw/master/img/hipchat-bot.png "Hipchat bot")

This hipchat bot doesn't need any server as its run's as **AWS:Lambda** function.

