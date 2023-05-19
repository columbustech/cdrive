FROM ubuntu:latest

RUN apt-get update && apt-get install -y vim git wget

ENV GOPATH /go
ENV PATH $GOPATH/bin:/usr/local/go/bin:$PATH
ENV GO111MODULE=on

WORKDIR /go/src/github.com/columbustech/cdrive-installer

#COPY src .

CMD ["sh", "-c", "tail -f /dev/null"]
