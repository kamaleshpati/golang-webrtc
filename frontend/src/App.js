import Button from "@material-ui/core/Button"
import IconButton from "@material-ui/core/IconButton"
import TextField from "@material-ui/core/TextField"
import AssignmentIcon from "@material-ui/icons/Assignment"
import PhoneIcon from "@material-ui/icons/Phone"
import React, { useEffect, useRef, useState } from "react"
import { CopyToClipboard } from "react-copy-to-clipboard"
import Peer from "simple-peer"
import "./App.css"


const newSocket = new WebSocket("ws://localhost:8080/ws")
function App() {
	const [ me, setMe ] = useState("")
	const [ stream, setStream ] = useState()
	const [ receivingCall, setReceivingCall ] = useState(false)
	const [ caller, setCaller ] = useState("")
	const [ callerSignal, setCallerSignal ] = useState()
	const [ signalc, setSignalc ] = useState(null)
	const [ callAccepted, setCallAccepted ] = useState(false)
	const [ idToCall, setIdToCall ] = useState("")
	const [ callEnded, setCallEnded] = useState(false)
	const [ name, setName ] = useState("")
	const myVideo = useRef()
	const userVideo = useRef()
	const connectionRef= useRef()

	useEffect(() => {
		navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
			setStream(stream)
				myVideo.current.srcObject = stream
		})

		newSocket.onopen = (event)=>{
			newSocket.send(JSON.stringify({
				type:"create-room"
			}))
		}

		newSocket.onmessage = (event)=>{
			console.log("1");
			let data = JSON.parse(event.data)
			switch (data["type"]){
				case "create-room":
					setMe(data["data"]["room_id"])
					break;
				case "call-room":
					setReceivingCall(true);
					setCaller(data["data"]["from"]);
					setName(data["data"]["name"]);
					setCallerSignal(data["data"]["signalData"])
					break;
				case "answer-room":
					console.log(data["data"]["signal"]);
					setSignalc(data["data"]["signal"])
					console.log(signalc);
					console.log(me);
					break;
				default:
					console.log(data);
			}

		}

		

	}, [me, signalc])

	const callUser = (id) => {
		const peer = new Peer({
			initiator: true,
			trickle: false,
			stream: stream
		})
		peer.on("signal", (data) => {
			let datas =  {
				userToCall: id,
				signalData: data,
				from: me,
				name: name
			}
			newSocket.send(JSON.stringify({type:"call-room", data:datas}))
		})
		peer.on("stream", (stream) => {
			userVideo.current.srcObject = stream
			
		})

		newSocket.onmessage = (event)=>{
			console.log("2");
			let data = JSON.parse(event.data)
			switch (data["type"]){
				case "answer-room":
					setCallAccepted(true)
					peer.signal(data["data"]["signal"])
					break
				default:
					console.log(data);
			}
		}


		connectionRef.current = peer
	}

	const answerCall =() =>  {
		setCallAccepted(true)
		const apeer = new Peer({
			initiator: false,
			trickle: false,
			stream: stream
		})
		apeer.on("signal", (data) => {
			newSocket.send(JSON.stringify({type:"answer-room", data:{ signal: data, to: caller }}))
		})
		apeer.on("stream", (stream) => {
			userVideo.current.srcObject = stream
		})

		apeer.signal(callerSignal)
		connectionRef.current = apeer
	}

	const leaveCall = () => {
		setCallEnded(true)
		connectionRef.current.destroy()
	}

	return (
		<>
			<h1 style={{ textAlign: "center", color: '#fff' }}>Zoomish</h1>
		<div className="container">
			<div className="video-container">
				<div className="video">
					{stream &&  <video playsInline muted ref={myVideo} autoPlay style={{ width: "300px" }} />}
				</div>
				<div className="video">
					{callAccepted && !callEnded ?
					<video playsInline ref={userVideo} autoPlay style={{ width: "300px"}} />:
					null}
				</div>
			</div>
			<div className="myId">
				<TextField
					id="filled-basic"
					label="Name"
					variant="filled"
					value={name}
					onChange={(e) => setName(e.target.value)}
					style={{ marginBottom: "20px" }}
				/>
				<CopyToClipboard text={me} style={{ marginBottom: "2rem" }}>
					<Button variant="contained" color="primary" startIcon={<AssignmentIcon fontSize="large" />}>
						Copy ID
					</Button>
				</CopyToClipboard>

				<TextField
					id="filled-basic"
					label="ID to call"
					variant="filled"
					value={idToCall}
					onChange={(e) => setIdToCall(e.target.value)}
				/>
				<div className="call-button">
					{callAccepted && !callEnded ? (
						<Button variant="contained" color="secondary" onClick={leaveCall}>
							End Call
						</Button>
					) : (
						<IconButton color="primary" aria-label="call" onClick={() => callUser(idToCall)}>
							<PhoneIcon fontSize="large" />
						</IconButton>
					)}
					{idToCall}
				</div>
			</div>
			<div>
				{receivingCall && !callAccepted ? (
						<div className="caller">
						<h1 >{name} is calling...</h1>
						<Button variant="contained" color="primary" onClick={answerCall}>
							Answer
						</Button>
					</div>
				) : null}
			</div>
		</div>
		</>
	)
}

export default App
