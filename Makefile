LAMBDA_NAME ?= hipchat
AWS_BUCKET ?= hdc-lambda
STACK_NAME ?= hipchat-sam

node_module:
	docker run -it -v $PWD:$PWD -w $PWD node:4-alpine npm install \
		aws-sdk \
		request
	
build:
	jar -cMf $(LAMBDA_NAME).zip $(LAMBDA_NAME).js node_modules/
	aws s3 cp $(LAMBDA_NAME).zip s3://$(AWS_BUCKET)

update-lambda: build
	aws lambda update-function-code --function-name $(shell aws cloudformation describe-stack-resources --stack-name $(STACK_NAME) --logical-resource-id GetFunction --query 'StackResources[].PhysicalResourceId' --out text) \
		--zip-file fileb://$(LAMBDA_NAME).zip


create-bucket:
	aws s3 mb s3://$(AWS_BUCKET)

create-cf:
	aws cloudformation create-stack \
	  --stack-name $(STACK_NAME) \
	  --template-body file://empty.template

create-change:
	@aws cloudformation create-change-set \
	  --capabilities CAPABILITY_IAM \
	  --stack-name "${STACK_NAME}" \
	  --change-set-name "initial" \
	  --tags \
	     Key=Owner,Value=${USER} \
	  --parameters \
	      ParameterKey=HipchatRoomId,ParameterValue=$(HIPCHAT_ROOM_ID),UsePreviousValue=false \
		  ParameterKey=HipchatToken,ParameterValue=$(HIPCHAT_TOKEN),UsePreviousValue=false \
	  --template-body file://$(LAMBDA_NAME).template

execute-change:
	aws cloudformation execute-change-set \
	  --stack-name "${STACK_NAME}" \
	  --change-set-name "initial"

clean-log-streams:
	aws logs describe-log-streams --log-group-name "API-Gateway-Execution-Logs_i1enpt53z0/Stage" --query logStreams[].logStreamName --out text | xargs -t -n 1 -P 5 aws logs delete-log-stream --log-group-name API-Gateway-Execution-Logs_i1enpt53z0/Stage --log-stream-name
