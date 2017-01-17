package main

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ec2"
)

func getInstances(reg string) []*ec2.Instance {
	sess, err := session.NewSession()
	if err != nil {
		panic(err)
	}

	svc := ec2.New(sess, &aws.Config{Region: aws.String(reg)})
	resp, err := svc.DescribeInstances(nil)
	if err != nil {
		panic(err)
	}

	instances := []*ec2.Instance{}

	for _, res := range resp.Reservations {
		for _, inst := range res.Instances {
			//fmt.Println("    - Instance ID: ", *inst.InstanceId)
			instances = append(instances, inst)
		}
	}
	return instances
}

func getRegions() []string {
	return []string{
		"eu-central-1",
		"eu-west-1",
		"us-east-1",
	}
}
func getAllInstances() {
	for _, reg := range getRegions() {
		for _, inst := range getInstances(reg) {
			fmt.Println(*inst.InstanceId)
		}
	}
}

var roomId string
var token string

func init() {
	roomId = os.Getenv("HIPCHAT_ROOM_ID")
	token = os.Getenv("HIPCHAT_TOKEN")
}

func hipchatMsg(msg string, color string, format string) {
	url := fmt.Sprintf("https://sequenceiq.hipchat.com/v2/room/%s/notification?auth_token=%s", roomId, token)
	fmt.Fprintln(os.Stderr, "URL:>", url)

	var jsonStr = []byte(fmt.Sprintf(`{
		"color": %#v,
		"message": %#v ,
		"notify":false,
		"message_format":%#v
	}`, color, msg, format))
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonStr))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	//fmt.Println("response Status:", resp.Status)
	//fmt.Println("response Headers:", resp.Header)
	body, _ := ioutil.ReadAll(resp.Body)
	fmt.Fprintln(os.Stderr, "response Body:", string(body))
}

func main() {
	//fmt.Println("AWS instances: ...")

	getAllInstances()
	//hipchatMsg("hello <b>jeno</b>", "red", "html")

	fmt.Println(`
{
	"statusCode": 200,
	"headers": {
		"x-custom-header" : "my custom header value"
	},
	"body": "a"
}`)
}
