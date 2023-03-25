package main

import (
	"context"
	"fmt"

	"github.com/nanobus/iota/go/handler"
	"github.com/nanobus/iota/go/rx/mono"
	"github.com/nanobus/iota/go/transport/rsocket"

	"github.com/nanobus/iota/go/example/greeter"
)

func main() {
	ctx := context.Background()
	svc := greeterService{}
	greeter.RegisterGreeter(&svc)
	h := handler.New(ctx, handler.ClientMode)

	if err := rsocket.Connect(h); err != nil {
		panic(err)
	}
}

type greeterService struct{}

func (*greeterService) SayHello(ctx context.Context, firstName, lastName string) mono.Mono[string] {
	fmt.Println("SayHello called!")
	return mono.Just("Hello, " + firstName + " " + lastName)
}
