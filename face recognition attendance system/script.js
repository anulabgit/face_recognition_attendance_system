const video = document.getElementById('video');
const statusElem = document.getElementById('status');

const studentDatabase = {};

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
  faceapi.nets.faceExpressionNet.loadFromUri('/models')
]).then(startVideo);

function startVideo() {
  navigator.getUserMedia(
    { video: {} },
    stream => video.srcObject = stream,
    err => console.error(err)
  );
}

video.addEventListener('play', () => {
  const canvas = faceapi.createCanvasFromMedia(video)
  document.body.append(canvas)
  const displaySize = { width: video.width, height: video.height }
  faceapi.matchDimensions(canvas, displaySize)
  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions()
    const resizedDetections = faceapi.resizeResults(detections, displaySize)
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    faceapi.draw.drawDetections(canvas, resizedDetections)
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections)
  }, 100)
})

async function registerStudent() {
  const studentpn = document.getElementById('studentpn').value;
  const studentName = document.getElementById('studentName').value;

  if (!studentpn || !studentName) {
    alert('유효한 전화번호와 이름을 입력하십시오.');
    return;
  }

  const detection = await getFaceDescriptor(video);
  if (detection) {
    studentDatabase[studentpn] = {
      name: studentName,
      descriptor: detection.descriptor
    };
    statusElem.textContent = `${studentName} (${studentpn}) 성공적으로 등록`;
  } else {
    statusElem.textContent = '감지된 얼굴이 없습니다. 다시 시도해 주세요.';
  }
}

async function verifyAttendance() {
  const detection = await getFaceDescriptor(video);

  if (detection) {
    let matchedstudentpn = null;
    let minDistance = Infinity;

    for (const [studentpn, studentData] of Object.entries(studentDatabase)) {
      const distance = faceapi.euclideanDistance(studentData.descriptor, detection.descriptor);
      if (distance < minDistance) {
        minDistance = distance;
        matchedstudentpn = studentpn;
      }
    }

    if (minDistance < 0.6) {
      const matchedStudent = studentDatabase[matchedstudentpn];
      statusElem.textContent = `출석 확인: ${matchedStudent.name} (${matchedstudentpn}).`;
    } else {
      statusElem.textContent = '일치하는 항목이 없습니다. 출석이 확인되지 않았습니다.';
    }
  } else {
    statusElem.textContent = '감지된 얼굴이 없습니다. 다시 시도해 주세요.';
  }
}

async function getFaceDescriptor(input) {
  const detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection;
}

document.getElementById('registerStudent').addEventListener('click', registerStudent);
document.getElementById('verifyAttendance').addEventListener('click', verifyAttendance);
