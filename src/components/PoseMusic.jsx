import React, { useEffect, useRef, useState } from "react";
import "@tensorflow/tfjs";
import * as tmPose from "@teachablemachine/pose";

const PoseMusic = () => {
  const canvasRef = useRef(null);
  const labelContainerRef = useRef(null);
  const [selectedInstrument, setSelectedInstrument] = useState("piano");
  const selectedInstrumentRef = useRef("piano"); // new ref

  useEffect(() => {
    selectedInstrumentRef.current = selectedInstrument; // keep ref in sync
  }, [selectedInstrument]);

  const URL = "./my_model/";
  let model, webcam, ctx, labelContainer, maxPredictions;
  let previousActiveGesture = null;

  useEffect(() => {
    return () => {
      if (webcam?.stop) webcam.stop();
    };
  }, []);

  const init = async () => {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    model = await tmPose.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    const widthSize = 700;
    const heightSize = 500;
    const flip = true;

    webcam = new tmPose.Webcam(widthSize, heightSize, flip);
    await webcam.setup();
    await webcam.play();
    window.requestAnimationFrame(loop);

    const canvas = canvasRef.current;
    canvas.width = widthSize;
    canvas.height = heightSize;
    ctx = canvas.getContext("2d");

    labelContainer = labelContainerRef.current;
    labelContainer.innerHTML = "";
    for (let i = 0; i < maxPredictions; i++) {
      labelContainer.appendChild(document.createElement("div"));
    }
  };

  const loop = async () => {
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
  };

  const predict = async () => {
    const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
    const prediction = await model.predict(posenetOutput);

    let activeGesture = null;
    let activeGestureValue = 0;

    for (let i = 0; i < maxPredictions; i++) {
      const predictValue = prediction[i].probability.toFixed(2);
      const classPrediction = `${prediction[i].className}: ${predictValue}`;
      labelContainer.childNodes[i].innerHTML = classPrediction;

      if (predictValue > activeGestureValue) {
        activeGesture = prediction[i].className;
        activeGestureValue = predictValue;
      }
    }

    if (
      activeGesture &&
      activeGesture !== previousActiveGesture &&
      activeGestureValue > 0.8
    ) {
      playMusic(activeGesture);
      previousActiveGesture = activeGesture;
    }

    drawPose(pose);
  };

  const playMusic = (pose) => {
    const audio = new Audio();
    const basePath = "/tracks";
    const instrument = selectedInstrumentRef.current;

    console.log("Using instrument:", instrument);

    if (instrument === "piano") {
      audio.src = `${basePath}/piano-${pose.slice(-1)}.wav`;
    } else if (instrument === "guitar") {
      audio.src = `${basePath}/guitar-${pose.slice(-1)}.wav`;
    }

    audio.play();
  };

  const drawPose = (pose) => {
    if (webcam.canvas) {
      ctx.drawImage(webcam.canvas, 0, 0);
      if (pose) {
        const minPartConfidence = 0.5;
        tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
        tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
      }
    }
  };

  return (
    <div className="container">
      <div className="wrapper">
        <div className="instructions">
          <p>Pose 1 : left hand front</p>
          <p>Pose 2 : both hands front</p>
          <p>Pose 3 : left hand on right shoulder</p>
          <p>Pose 4 : both hands on opposite shoulders</p>
          <p>Pose 5 : both hands bottom right</p>
          <p>Pose 6 : both hands bottom left</p>
          <button onClick={init}>Start</button>
          <button onClick={() => setSelectedInstrument("piano")}>Piano</button>
          <button onClick={() => setSelectedInstrument("guitar")}>Guitar</button>
        </div>
        <div className="camera-holder">
          <div className="canvas">
            <canvas id="canvas" ref={canvasRef}></canvas>
          </div>
        </div>
      </div>
      <div id="label-container" ref={labelContainerRef}></div>
    </div>
  );
};

export default PoseMusic;
