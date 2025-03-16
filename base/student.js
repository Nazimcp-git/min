// Firebase Configuration – replace with your own project settings
const firebaseConfig = {
  apiKey: "AIzaSyBXJ_RnfjUDi7qPDATWVnS5lSFw6jVRYgo",
  authDomain: "shopping-e284c.firebaseapp.com",
  databaseURL: "https://shopping-e284c-default-rtdb.firebaseio.com",
  projectId: "shopping-e284c",
  storageBucket: "shopping-e284c.appspot.com",
  messagingSenderId: "248274428739",
  appId: "1:248274428739:web:fc30dd9eb1ef83f610c5f6",
  measurementId: "G-ZXZCK9BW7T"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Event listener for lookup button
document.getElementById("lookup-btn").addEventListener("click", lookupStudent);

function lookupStudent() {
  const studentId = document.getElementById("student-id-input").value.trim();
  const errorEl = document.getElementById("lookup-error");
  document.getElementById("loading").innerHTML = "Loading... Please Wait"
  errorEl.innerText = "";
  
  if (studentId === "") {
    errorEl.innerText = "Please enter your Student ID.";
    return;
  }

  // Search across all teachers for the student record
  db.ref("teachers").once("value").then(snapshot => {
    let found = false;
    let foundTeacherData = null;
    let studentRecord = null;
    
    snapshot.forEach(teacherSnap => {
      if (teacherSnap.hasChild("students") && teacherSnap.child("students").hasChild(studentId)) {
        found = true;
        foundTeacherData = teacherSnap.val();
        studentRecord = teacherSnap.child("students").child(studentId).val();
        return true; // Exit loop once found
      }
    });

    if (!found) {
      errorEl.innerText = "Student not found. Please check your ID.";
      document.getElementById("result").style.display = "none";
    } else {
      // Display the student details and marks

      var dropdown = document.getElementById("classDropdown");
        var selectedClass = dropdown.value;

        if (selectedClass) {
            localStorage.setItem("selectedClass", selectedClass); // Save to localStorage
        } else {
            alert("Please select a class first!");
        }



      document.getElementById("result").style.display = "block";
      document.getElementById("loading").style.display = "none";
      document.getElementById("student-name").innerText = "Name: " + studentRecord.name;
      
      
      // Get subjects from the teacher's record
      const subjects = foundTeacherData.subjects || {};
      const tbody = document.querySelector("#marks-table tbody");
      tbody.innerHTML = "";
      
      let totalMarks = 0;
      let subjectCount = 0;
      
      // For each subject, display the subject name and the corresponding mark (if any)
      for (let subjKey in subjects) {
        subjectCount++;
        const subjName = subjects[subjKey].name;
        let mark = 0;
        if (studentRecord.marks && studentRecord.marks[subjKey] && studentRecord.marks[subjKey].score !== undefined) {
          mark = Number(studentRecord.marks[subjKey].score);
        }
        totalMarks += mark;
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${subjName}</td><td>${mark}</td>`;
        tbody.appendChild(tr);
      }
      var savedClass = localStorage.getItem("selectedClass");
            var output = document.getElementById("classes");

            if (savedClass) {
              output.textContent = "Class: " + savedClass;
              document.getElementById("classDropdown").value = savedClass; // Set dropdown to saved value
          } else {
              output.textContent = "No class selected yet.";
          }
          
      // Calculate summary values:
      // Out-of mark = number of subjects * 50
      const outOfMarks = subjectCount * 50;
      // Calculate percentage (handle division by zero)
      const percentage = outOfMarks > 0 ? ((totalMarks / outOfMarks) * 100).toFixed(2) : 0;
      
      // Update summary display
      const summaryEl = document.getElementById("summary");
      summaryEl.innerHTML = `
        Overall Status : ${studentRecord.overallStatus} <br>
        Grand Total: ${totalMarks} / ${outOfMarks} <br>
        Percentage: ${percentage}%
      `;
    }
  }).catch(error => {
    errorEl.innerText = "Error: " + error.message;
  });
}
