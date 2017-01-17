LAMBDA_NAME ?= hipchat
AWS_BUCKET ?= hdc-lambda
STACK_NAME ?= hipchat-sam
LAMBDA_TIMEOUT ?= 30

node_module:
	docker run -it -v $(PWD):$(PWD) -w $(PWD) node:4-alpine npm install \
		aws-sdk \
		request \
		child_process
	
build:
	jar -cMf $(LAMBDA_NAME).zip $(LAMBDA_NAME).js node_modules/
	aws s3 cp $(LAMBDA_NAME).zip s3://$(AWS_BUCKET)

update-lambda: build
	aws lambda update-function-code --function-name $(shell aws cloudformation describe-stack-resources --stack-name $(STACK_NAME) --logical-resource-id GetFunction --query 'StackResources[].PhysicalResourceId' --out text) \
		--zip-file fileb://$(LAMBDA_NAME).zip


update-lambda-go:
	GOOS=linux go build -o main main.go
	zip -r lambda-go.zip main index.js node_modules/
	aws s3 cp lambda-go.zip s3://$(AWS_BUCKET)
	aws lambda update-function-code \
		--function-name lambda-go \
		--zip-file fileb://lambda-go.zip

create-bucket:
	aws s3 mb s3://$(AWS_BUCKET)

update-lambda-timeout:
	aws lambda update-function-configuration \
		--function-name $(shell aws cloudformation describe-stack-resources --stack-name $(STACK_NAME) --logical-resource-id GetFunction --query 'StackResources[].PhysicalResourceId' --out text) \
		--timeout $(LAMBDA_TIMEOUT)

create-stack:
	aws cloudformation create-change-set \
	  --change-set-type CREATE \
	  --capabilities CAPABILITY_IAM \
	  --stack-name "${STACK_NAME}" \
	  --change-set-name "initial" \
	  --tags \
	     Key=Owner,Value=${USER} \
	  --parameters \
	      ParameterKey=HipchatRoomId,ParameterValue=$(HIPCHAT_ROOM_ID),UsePreviousValue=false \
		  ParameterKey=HipchatToken,ParameterValue=$(HIPCHAT_TOKEN),UsePreviousValue=false \
	  --template-body file://$(LAMBDA_NAME).template
	
	aws cloudformation wait \
		change-set-create-complete \
		 --stack-name $(STACK_NAME) \
		 --change-set-name initial
	
	aws cloudformation execute-change-set \
	  --stack-name "${STACK_NAME}" \
	  --change-set-name "initial"
	aws cloudformation wait \
		stack-create-complete \
		 --stack-name $(STACK_NAME)

clean-log-streams:
	aws logs describe-log-streams --log-group-name "$(shell aws logs describe-log-groups --query 'logGroups[? ends_with(logGroupName, `/Prod`) ].logGroupName' --out text)" --query logStreams[].logStreamName --out text \
		| xargs --no-run-if-empty -t -n 1 -P 5 aws logs delete-log-stream --log-group-name $(shell aws logs describe-log-groups --query 'logGroups[? ends_with(logGroupName, `/Prod`) ].logGroupName' --out text) --log-stream-name
	aws logs describe-log-streams --log-group-name "$(shell aws logs describe-log-groups --query 'logGroups[? ends_with(logGroupName, `/Stage`) ].logGroupName' --out text)" --query logStreams[].logStreamName --out text \
		| xargs --no-run-if-empty -t -n 1 -P 5 aws logs delete-log-stream --log-group-name $(shell aws logs describe-log-groups --query 'logGroups[? ends_with(logGroupName, `/Stage`) ].logGroupName' --out text) --log-stream-name
	aws logs describe-log-streams --log-group-name "$(shell aws logs describe-log-groups --query 'logGroups[? starts_with(logGroupName, `/aws/lambda/hipchat-sam`) ].logGroupName' --out text)" --query logStreams[].logStreamName --out text \
		| xargs --no-run-if-empty -t -n 1 -P 5 aws logs delete-log-stream --log-group-name $(shell aws logs describe-log-groups --query 'logGroups[? starts_with(logGroupName, `/aws/lambda/hipchat-sam`) ].logGroupName' --out text) --log-stream-name
	
docker-test:
	@docker run \
		-e AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID) \
		-e AWS_DEFAULT_REGION=$(AWS_DEFAULT_REGION) \
		-e AWS_SECRET_ACCESS_KEY=$(AWS_SECRET_ACCESS_KEY) \
		-v $(PWD):/var/task \
		lambci/lambda hipchat.handler
