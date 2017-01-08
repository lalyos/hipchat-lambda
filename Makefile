LAMBDA_NAME ?= hipchat
AWS_BUCKET ?= hdc-lambda

node_module:
	docker run -it -v $PWD:$PWD -w $PWD node:4-alpine npm install \
		aws-sdk \
		request
	
build:
	jar -cMf $(LAMBDA_NAME).zip $(LAMBDA_NAME).js node_modules/
	aws s3 cp $(LAMBDA_NAME).js s3://$(AWS_BUCKET)

create-bucket:
	aws s3 mb s3://$(AWS_BUCKET)
