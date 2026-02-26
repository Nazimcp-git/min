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
  
  const auth = firebase.auth();
  const db = firebase.database();
  const PASS_MARK = 40; // Not used for status now
  
  /* Utility function: Generate a unique 6-character alphanumeric student ID */
  function generateStudentId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }
  
  /* Check which page we are on based on body class */
  if (document.body.classList.contains("login-page")) {
    // --- Login Page Logic ---
    document.getElementById("login-btn").addEventListener("click", login);
  
    function login() {
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();
  
      auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
          localStorage.setItem("teacherId", userCredential.user.uid);
          window.location.href = "dashboard.html";
          
        })
        .catch(error => {
          document.getElementById("login-error").innerText = error.message;
        });
    }
  } else if (document.body.classList.contains("dashboard-page")) {
    // --- Dashboard Page Logic ---
  
    // Check for authenticated user
    auth.onAuthStateChanged(user => {
      if (user) {
        document.getElementById("teacher-email").innerText = user.email;
        initializeDashboard();
      } else {
        window.location.href = "index.html";
      }
    });
  
    // Logout functionality
    document.getElementById("logout-btn").addEventListener("click", () => {
      auth.signOut().then(() => {
        localStorage.removeItem("teacherId");
        window.location.href = "index.html";
      });
    });
  
    // Sidebar navigation (Subjects, Students, Marks)
    const navItems = document.querySelectorAll(".sidebar ul li");
    navItems.forEach(item => {
      item.addEventListener("click", () => {
        navItems.forEach(i => i.classList.remove("active"));
        item.classList.add("active");
        const target = item.getAttribute("data-target");
        document.querySelectorAll(".content-section").forEach(section => {
          section.classList.remove("active");
        });
        document.getElementById(`${target}-section`).classList.add("active");
        // Load data for the selected section
        if (target === "subjects") {
          loadSubjects();
        } else if (target === "students") {
          loadStudents();
        } else if (target === "marks") {
          loadSubjectsForMarks(); // Populate dropdown and load marks
        }
      });
    });
  
    // Retrieve teacherId from localStorage
    const teacherId = localStorage.getItem("teacherId");
  
    // --- Initialization ---
    function initializeDashboard() {
      // Default: load subjects section
      loadSubjects();
      document.getElementById("add-subject-btn").addEventListener("click", addSubject);
      document.getElementById("add-student-btn").addEventListener("click", addStudent);
      document.getElementById("save-marks-btn").addEventListener("click", updateAllMarks);
      document.getElementById("update-status-btn").addEventListener("click", updateOverallStatus);
    }
  
    // --- Subjects Functions ---
    function addSubject() {
      const subjectName = document.getElementById("subject-name").value.trim();
      if (subjectName === "") {
        alert("Please enter a subject name.");
        return;
      }
      const subjectRef = db.ref(`teachers/${teacherId}/subjects`).push();
      subjectRef.set({ name: subjectName }, error => {
        if (error) {
          alert("Error adding subject: " + error.message);
        } else {
          alert("Subject added successfully.");
          document.getElementById("subject-name").value = "";
          loadSubjects();
        }
      });
    }
  
    function loadSubjects() {
      const subjectList = document.getElementById("subject-list");
      subjectList.innerHTML = "";
      db.ref(`teachers/${teacherId}/subjects`).once("value")
        .then(snapshot => {
          snapshot.forEach(childSnapshot => {
            const subject = childSnapshot.val();
            const li = document.createElement("li");
            li.textContent = `${childSnapshot.key} - ${subject.name}`;
            subjectList.appendChild(li);
          });
        });
    }
  
    // --- Students Functions (Editable Overall Status) ---
    function addStudent() {
      const studentName = document.getElementById("student-name").value.trim();
      if (studentName === "") {
        alert("Please enter a student name.");
        return;
      }
      // Generate a unique 6-character alphanumeric student ID
      const studentId = generateStudentId();
      db.ref(`teachers/${teacherId}/students/${studentId}`).set({
        name: studentName,
        marks: {}
      }, error => {
        if (error) {
          alert("Error adding student: " + error.message);
        } else {
          alert("Student added successfully. Student ID: " + studentId);
          document.getElementById("student-name").value = "";
          loadStudents();
        }
      });
    }
  
    function loadStudents() {
      const tbody = document.querySelector("#student-table tbody");
      tbody.innerHTML = "";
      db.ref(`teachers/${teacherId}/students`).once("value")
        .then(snapshot => {
          snapshot.forEach(childSnapshot => {
            const student = childSnapshot.val();
            // Use the stored overallStatus if available (or default to empty)
            const currentStatus = student.overallStatus || "";
            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td>${childSnapshot.key}</td>
              <td>${student.name}</td>
              <td>
                <select data-student-id="${childSnapshot.key}">
                  <option value="">Select</option>
                  <option value="Passed and Promoted" ${currentStatus === "Pass" ? "selected" : ""}>Pass</option>
                  <option value="Fail" ${currentStatus === "Fail" ? "selected" : ""}>Fail</option>
                </select>
              </td>
            `;
            tbody.appendChild(tr);
          });
        });
    }
  
    // Update overall status for each student based on the selected value in the dropdowns
    function updateOverallStatus() {
      const selects = document.querySelectorAll("#student-table tbody select");
      let updatesCompleted = 0;
      const total = selects.length;
      if (total === 0) {
        alert("No students to update.");
        return;
      }
      selects.forEach(select => {
        const studentId = select.getAttribute("data-student-id");
        const status = select.value;
        db.ref(`teachers/${teacherId}/students/${studentId}/overallStatus`).set(status, error => {
          updatesCompleted++;
          if (error) {
            alert("Error updating student " + studentId + ": " + error.message);
          }
          if (updatesCompleted === total) {
            alert("Overall status updated successfully.");
            loadStudents();
          }
        });
      });
    }
  
    // --- Marks Functions (Simplified: Marks Entry Only) ---
    // Populate the subject dropdown for marks section
    function loadSubjectsForMarks() {
      const dropdown = document.getElementById("marks-subject-dropdown");
      dropdown.innerHTML = '<option value="">--Select Subject--</option>';
      db.ref(`teachers/${teacherId}/subjects`).once("value")
        .then(snapshot => {
          snapshot.forEach(childSnapshot => {
            const subject = childSnapshot.val();
            const option = document.createElement("option");
            option.value = childSnapshot.key;
            option.textContent = subject.name;
            dropdown.appendChild(option);
          });
        })
        .then(() => {
          dropdown.addEventListener("change", loadStudentMarks);
          if (dropdown.value) {
            loadStudentMarks();
          } else {
            document.getElementById("marks-table-body").innerHTML = "";
          }
        });
    }
  
    // Load all students along with their current marks for the selected subject
    function loadStudentMarks() {
      const subjectId = document.getElementById("marks-subject-dropdown").value;
      const tbody = document.getElementById("marks-table-body");
      tbody.innerHTML = "";
      if (!subjectId) return;
  
      db.ref(`teachers/${teacherId}/students`).once("value")
        .then(snapshot => {
          snapshot.forEach(childSnapshot => {
            const studentId = childSnapshot.key;
            const student = childSnapshot.val();
            let currentMark = "";
            if (student.marks && student.marks[subjectId]) {
              currentMark = student.marks[subjectId].score;
            }
            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td>${studentId}</td>
              <td>${student.name}</td>
              <td><input type="number" value="${currentMark}" data-student-id="${studentId}" /></td>
            `;
            tbody.appendChild(tr);
          });
        });
    }
  
    // Update marks for all students displayed in the marks table for the selected subject
    function updateAllMarks() {
      const subjectId = document.getElementById("marks-subject-dropdown").value;
      if (!subjectId) {
        alert("Please select a subject.");
        return;
      }
      const rows = document.querySelectorAll("#marks-table-body tr");
      if (rows.length === 0) {
        alert("No students found to update.");
        return;
      }
      let updatesCompleted = 0;
      rows.forEach(row => {
        const studentId = row.querySelector("input").getAttribute("data-student-id");
        const scoreInput = row.querySelector("input").value.trim();
        const score = Number(scoreInput);
        db.ref(`teachers/${teacherId}/students/${studentId}/marks/${subjectId}`).set({
          score: score
        }, error => {
          if (error) {
            alert("Error updating marks for student " + studentId + ": " + error.message);
          }
          updatesCompleted++;
          if (updatesCompleted === rows.length) {
            alert("All marks updated successfully.");
          }
        });
      });
    }
  }

  function meNu(){
    if(document.getElementById("close").innerHTML = "Menu"){
      document.getElementById("sideb").style.display = "block";
      document.getElementById("close").innerHTML = "Close"
    }
    else{
      document.getElementById("sideb").style.display = "none"
    }
    
    
  }
  function cloSe(){
    if(document.getElementById("close").innerHTML = "Close"){
      document.getElementById("sideb").style.display = "none";
      document.getElementById("close").innerHTML = "Menu"
    }
    else{
      document.getElementById("sideb").style.display = "none"
    }
  }
  