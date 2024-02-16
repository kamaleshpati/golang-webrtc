package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/gorilla/websocket"
)

type WsEvent struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type WsResponse struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type VideoRoom struct {
	RoomID string `json:"room_id"`
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

var connections = make(map[string]*websocket.Conn)

var counter = 0

func createRoomInstance(roomId string) VideoRoom {
	return VideoRoom{
		RoomID: roomId,
	}
}

func reader(conn *websocket.Conn) {
	for {
		messageType, messageBody, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			return
		}

		var jsonMessage WsEvent
		if jsonerr := json.Unmarshal(messageBody, &jsonMessage); jsonerr != nil {
			log.Println(jsonerr)
			return
		}

		switch jsonMessage.Type {
		case "create-room":
			counter += 1
			connections[strconv.Itoa(counter)] = conn
			room := createRoomInstance(strconv.Itoa(counter))
			response := WsResponse{
				Type: "create-room",
				Data: room,
			}
			data, jsonerr := json.Marshal(response)
			if jsonerr != nil {
				panic(jsonerr)
			}
			sendResponse(conn, messageType, data)
		case "call-room":
			data := jsonMessage.Data.(map[string]interface{})
			con := connections[fmt.Sprintf("%v", data["userToCall"])]
			data["name"] = "abcd"
			response := WsResponse{
				Type: "call-room",
				Data: data,
			}
			dataJ, jsonerr := json.Marshal(response)
			if jsonerr != nil {
				panic(jsonerr)
			}
			sendResponse(con, messageType, dataJ)

		case "answer-room":
			data := jsonMessage.Data.(map[string]interface{})
			con := connections[fmt.Sprintf("%v", data["to"])]
			response := WsResponse{
				Type: "answer-room",
				Data: data,
			}
			dataJ, jsonerr := json.Marshal(response)
			if jsonerr != nil {
				panic(jsonerr)
			}
			sendResponse(con, messageType, dataJ)

		default:
			sendResponse(conn, messageType, messageBody)
		}

	}
}

func sendResponse(conn *websocket.Conn, messageType int, messageBody []byte) {
	if err := conn.WriteMessage(messageType, messageBody); err != nil {
		log.Println(err)
		return
	}
}

func serveWs(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
	}
	reader(ws)
}

func setupRoutes() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Simple Server")
	})
	http.HandleFunc("/ws", serveWs)
}

func main() {
	fmt.Println("Video App v0.01")
	setupRoutes()
	http.ListenAndServe(":8080", nil)
}
