// Firebase Configuration
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

/* Utility: Generate ID */
function generateStudentId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/* Page Logic Router */
if (document.body.classList.contains("login-page")) {
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

  auth.onAuthStateChanged(user => {
    if (user) {
      document.getElementById("teacher-email").innerText = user.email;
      initializeDashboard();
    } else {
      window.location.href = "index.html";
    }
  });

  document.getElementById("logout-btn").addEventListener("click", () => {
    auth.signOut().then(() => {
      localStorage.removeItem("teacherId");
      window.location.href = "index.html";
    });
  });

  // Sidebar Navigation Logic
  const navItems = document.querySelectorAll(".sidebar ul li");
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent trigger cloSe()
      navItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");
      const target = item.getAttribute("data-target");
      
      document.querySelectorAll(".content-section").forEach(section => {
        section.classList.remove("active");
      });
      document.getElementById(`${target}-section`).classList.add("active");

      if (target === "subjects") loadSubjects();
      else if (target === "students") loadStudents();
      else if (target === "marks") loadSubjectsForMarks();
    });
  });

  const teacherId = localStorage.getItem("teacherId");

  function initializeDashboard() {
    loadSubjects();
    document.getElementById("add-subject-btn").addEventListener("click", addSubject);
    document.getElementById("add-student-btn").addEventListener("click", addStudent);
    document.getElementById("save-marks-btn").addEventListener("click", updateAllMarks);
    document.getElementById("update-status-btn").addEventListener("click", updateOverallStatus);
    
    // Add change listener to marks dropdown once
    document.getElementById("marks-subject-dropdown").addEventListener("change", loadStudentMarks);
  }

  // --- Subjects ---
  function addSubject() {
    const subjectName = document.getElementById("subject-name").value.trim();
    if (subjectName === "") return alert("Please enter a subject name.");
    
    const subjectRef = db.ref(`teachers/${teacherId}/subjects`).push();
    subjectRef.set({ name: subjectName }, error => {
      if (!error) {
        alert("Subject added.");
        document.getElementById("subject-name").value = "";
        loadSubjects();
      }
    });
  }

  function loadSubjects() {
    const subjectList = document.getElementById("subject-list");
    subjectList.innerHTML = "";
    db.ref(`teachers/${teacherId}/subjects`).once("value").then(snapshot => {
      snapshot.forEach(childSnapshot => {
        const subject = childSnapshot.val();
        const li = document.createElement("li");
        // Added Tailwind classes via JS for better look
        li.className = "p-3 hover:bg-gray-50 flex justify-between items-center";
        li.innerHTML = `<span class="font-medium text-gray-700">${subject.name}</span> <small class="text-gray-400">${childSnapshot.key}</small>`;
        subjectList.appendChild(li);
      });
    });
  }

  // --- Students ---
  function addStudent() {
    const studentName = document.getElementById("student-name").value.trim();
    if (studentName === "") return alert("Please enter student name.");
    const studentId = generateStudentId();
    db.ref(`teachers/${teacherId}/students/${studentId}`).set({
      name: studentName,
      marks: {},
      overallStatus: ""
    }, error => {
      if (!error) {
        alert("Student added: " + studentId);
        document.getElementById("student-name").value = "";
        loadStudents();
      }
    });
  }

  function loadStudents() {
    const tbody = document.querySelector("#student-table tbody");
    tbody.innerHTML = "";
    db.ref(`teachers/${teacherId}/students`).once("value").then(snapshot => {
      snapshot.forEach(childSnapshot => {
        const student = childSnapshot.val();
        const currentStatus = student.overallStatus || "";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="px-6 py-4">${childSnapshot.key}</td>
          <td class="px-6 py-4 font-medium">${student.name}</td>
          <td class="px-6 py-4">
            <select data-student-id="${childSnapshot.key}" class="border rounded p-1">
              <option value="">Select</option>
              <option value="Passed and Promoted" ${currentStatus === "Passed and Promoted" ? "selected" : ""}>Pass</option>
              <option value="Fail" ${currentStatus === "Fail" ? "selected" : ""}>Fail</option>
            </select>
          </td>
        `;
        tbody.appendChild(tr);
      });
    });
  }

  function updateOverallStatus() {
    const selects = document.querySelectorAll("#student-table tbody select");
    const total = selects.length;
    if (total === 0) return alert("No students to update.");
    
    let updatesCompleted = 0;
    selects.forEach(select => {
      const studentId = select.getAttribute("data-student-id");
      const status = select.value;
      db.ref(`teachers/${teacherId}/students/${studentId}/overallStatus`).set(status, error => {
        updatesCompleted++;
        if (updatesCompleted === total) {
          alert("Status updated successfully.");
          loadStudents();
        }
      });
    });
  }

  // --- Marks ---
  function loadSubjectsForMarks() {
    const dropdown = document.getElementById("marks-subject-dropdown");
    const currentValue = dropdown.value;
    dropdown.innerHTML = '<option value="">--Select Subject--</option>';
    db.ref(`teachers/${teacherId}/subjects`).once("value").then(snapshot => {
      snapshot.forEach(childSnapshot => {
        const subject = childSnapshot.val();
        const option = document.createElement("option");
        option.value = childSnapshot.key;
        option.textContent = subject.name;
        dropdown.appendChild(option);
      });
      dropdown.value = currentValue; // Keep selection if it exists
    });
  }

  function loadStudentMarks() {
    const subjectId = document.getElementById("marks-subject-dropdown").value;
    const tbody = document.getElementById("marks-table-body");
    tbody.innerHTML = "";
    if (!subjectId) return;

    db.ref(`teachers/${teacherId}/students`).once("value").then(snapshot => {
      snapshot.forEach(childSnapshot => {
        const student = childSnapshot.val();
        let currentMark = (student.marks && student.marks[subjectId]) ? student.marks[subjectId].score : "";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="px-6 py-4">${childSnapshot.key}</td>
          <td class="px-6 py-4">${student.name}</td>
          <td class="px-6 py-4"><input type="number" class="border rounded px-2 py-1 w-20" value="${currentMark}" data-student-id="${childSnapshot.key}" /></td>
        `;
        tbody.appendChild(tr);
      });
    });
  }

  function updateAllMarks() {
    const subjectId = document.getElementById("marks-subject-dropdown").value;
    if (!subjectId) return alert("Please select a subject.");
    const rows = document.querySelectorAll("#marks-table-body tr");
    let updatesCompleted = 0;
    rows.forEach(row => {
      const input = row.querySelector("input");
      const studentId = input.getAttribute("data-student-id");
      const score = input.value.trim() === "" ? "" : Number(input.value);
      
      db.ref(`teachers/${teacherId}/students/${studentId}/marks/${subjectId}`).set({ score: score }, () => {
        updatesCompleted++;
        if (updatesCompleted === rows.length) alert("Marks saved.");
      });
    });
  }
}

/* UI Menu Toggles - Fixed the comparison bug */
function meNu() {
  const side = document.getElementById("sideb");
  const btn = document.getElementById("close");
  if (btn.innerText === "Menu") {
    side.style.display = "block";
    btn.innerText = "Close";
  } else {
    side.style.display = "none";
    btn.innerText = "Menu";
  }
}

function cloSe() {
  // Only close if it's currently open (on mobile)
  if (window.innerWidth < 768) {
    document.getElementById("sideb").style.display = "none";
    document.getElementById("close").innerText = "Menu";
  }
}
