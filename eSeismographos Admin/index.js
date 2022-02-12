import { initializeApp } from "https://www.gstatic.com/firebasejs/9.4.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  deleteUser,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.4.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  off
} from "https://www.gstatic.com/firebasejs/9.4.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCMZ64PZL80WmiHd5S-Fg1bPy0GGamCnCQ",
  authDomain: "e-seismographos.firebaseapp.com",
  databaseURL:
    "https://e-seismographos-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "e-seismographos",
  storageBucket: "e-seismographos.appspot.com",
  messagingSenderId: "779181211465",
  appId: "1:779181211465:web:428757753ddf71c7472498",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
var seismographRef = '';

//Sign In Process
document.getElementById("signInBtn").onclick = signIn;
document.getElementById("signUpBtn").onclick = signUp;
document.getElementById("signUpLink").onclick = showSignUp;
document.getElementById("signInLink").onclick = showSignIn;

//Dashboard
document.getElementById("my_seismographs").onclick = () =>
  loadPanel("mySeismographsDiv");
document.getElementById("announcements").onclick = () =>
  loadPanel("announcementsDiv");
document.getElementById("seismographs").onclick = () =>
  loadPanel("seismographsDiv");
document.getElementById("settings").onclick = () => loadPanel("settingsDiv");

document.getElementById("changeNameBtn").onclick = () => {
  var newName = document.getElementById("newNameRef").value;

  if (newName.length != 0) {
    const user = auth.currentUser;
    set(ref(database, "users/" + user.uid + "/name"), newName).then(() => {
      alert("Πραγματοποιήθηκε αλλαγή ονόματος.");
    });
  } else {
    alert("Παρακαλώ εισάγετε ένα όνομα.");
  }
};

//Delete account
document.getElementById("deleteBtn").onclick = () => {
  set(ref(database, "users/" + auth.currentUser.uid), null).then(() => {
    deleteUser(auth.currentUser)
      .then(() => {
        window.location.replace("index.html");
      })
      .catch(() => {
        alert("Δεν διαγράφηκε ο λογαριασμός σας, προσπαθήστε ξανά.");
      });
  });
};

//Seismographs

function loadMySeismographs() {
  document.getElementById("mySeismographsRow").innerHTML = "";
  get(ref(database, `users/${auth.currentUser.uid}/seismographs/`))
    .then((snapshot) => {
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          var seismograph = document.createElement("div");
          seismograph.setAttribute("class", "card");
          var seismograph_name = child.val();
          var seismograph_id = child.key;
          var btnId = `btn_` + seismograph_id;
          var deleteBtnId = 'delete_' + btnId;

          var div =
            `<div class='card-header'><h1>` +
            seismograph_name +
            `</h1></div><div class='card-body'><p>` +
            seismograph_id +
            `</p><a id='` +
            btnId +
            `' class='btn'>Περισσότερα</a><a id='` + deleteBtnId + `' class='btnDelete'>Διαγραφή</a></div>`;;
          seismograph.innerHTML = div;
          document.getElementById("mySeismographsRow").appendChild(seismograph);
          document.getElementById(btnId).onclick = () => {
            loadSeismograph(seismograph_name, seismograph_id);
          };
          document.getElementById(deleteBtnId).onclick = () => {
            set(ref(database, `users/${auth.currentUser.uid}/seismographs/${seismograph_id}`), null).then(() => {
              loadPanel('mySeismographsDiv')
            })
          };
        });
      } else {
      }
    })
    .catch(() => {});
}

function loadSeismographs() {
  document.getElementById("seismographsRow").innerHTML = "";
  get(ref(database, `seismographs/`))
    .then((snapshot) => {
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          var seismograph = document.createElement("div");
          seismograph.setAttribute("class", "card");
          var seismograph_name = child.val()['name'];
          var seismograph_id = child.key;
          
          var btnId = `_btn_` + seismograph_id;
          var div =
            `<div class='card-header'><h1>` +
            seismograph_name +
            `</h1></div><div class='card-body'><p>` +
            seismograph_id +
            `</p><a id='` +
            btnId +
            `' class='btn'>Περισσότερα</a></div>`;
          seismograph.innerHTML = div;
          document.getElementById("seismographsRow").appendChild(seismograph);
          document.getElementById(btnId).onclick = () => {
            loadSeismograph(seismograph_name, seismograph_id);
          };
        });
      } else {
      }
    })
    .catch((error) => {});
}

function loadSeismograph(name, id) {
  document.getElementById("seismographName").textContent = name;
  loadPanel("seismographDiv");

  const layout = {
    yaxis: {
      range: [-250, 250],
      type: 'linear'
    }
  }

  Plotly.newPlot("seismograph", [
    {
      y: [0],
      type: "line"
    },
  ], layout);

  seismographRef = ref(database, `data/${id}/live-data`)
  onValue(seismographRef, (snapshot) => {
    const r = snapshot.val()["r"];
    console.log(id)
    Plotly.extendTraces("seismograph", { y: [[r]] }, [0]);
  });
}

//Sign out
document.getElementById("signOutBtn").onclick = () => {
  signOut(auth).then(() => {
    window.location.replace("index.html");
  });
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("signIn").remove();
    document.getElementById("signUp").remove();
    if (document.getElementById("dashboard") != null) {
      document.getElementById("dashboard").style.display = "flex";
      loadPanel("seismographsDiv");
    }
  } else {
    document.getElementById("dashboard").remove();
    document.getElementById("signUp").style.display = "none";
    document.getElementById("signIn").style.display = "flex";
  }
});

function loadPanel(panel) {
  if (seismographRef != '') {
    off(seismographRef)
  }

  var panels = document.getElementsByClassName("panel");
  for (var i = 0; i < panels.length; i++) {
    panels[i].style.display = "none";
  }

  if (panel == "mySeismographsDiv") {
    loadMySeismographs();
  } else if (panel == "seismographsDiv") {
    loadSeismographs();
  }

  document.getElementById(panel).style.display = "block";
}

function signIn() {
  document.getElementById("signInLoader").style.display = "block";

  var email = document.getElementById("signInEmailRef").value;
  var password = document.getElementById("signInPasswordRef").value;

  if (email.length != 0 && password.length != 0) {
    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        window.location.replace("index.html");
      })
      .catch(() => {
        alert(
          "Ανεπιτυχής σύνδεση. Προσπαθήστε ξανά ελέγχοντας μια άλλη φορά το email και τον κωδικό σας."
        );

        document.getElementById("signInLoader").style.display = "none";
      });
  } else {
    document.getElementById("signInLoader").style.display = "none";
    alert("Παρακαλώ εισάγετε τα στοιχεία του λογαριασμού σας.");
  }
}

function signUp() {
  document.getElementById("signUpLoader").style.display = "block";

  var email = document.getElementById("signUpEmailRef").value;
  var password = document.getElementById("signUpPasswordRef").value;
  var passwordConfirmation = document.getElementById(
    "signUpPasswordConfirmation"
  ).value;
  var name = document.getElementById("signUpNameRef").value;

  if (
    email.length != 0 &&
    password.length != 0 &&
    passwordConfirmation.length != 0 &&
    name.length != 0
  ) {
    if (password == passwordConfirmation) {
      createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          const user = userCredential.user;
          set(ref(database, `users/${auth.currentUser.uid}`), {
            name: name,
          })
            .then(() => {
              window.location.replace("index.html");
            })
            .catch(() => {
              document.getElementById("signUpLoader").style.display = "none";
              deleteUser(user);
              alert("Ανεπιτυχής η εγγραφή. Προσπαθήστε ξανά.");
            });
        })
        .catch((error) => {
          document.getElementById("signUpLoader").style.display = "none";
          alert("Ανεπιτυχής η εγγραφή. Προσπαθήστε ξανά.");
        });
    } else {
      document.getElementById("signUpLoader").style.display = "none";
      alert("Παρακαλώ ελέγξτε ξανά τους κωδικούς σας.");
    }
  } else {
    document.getElementById("signUpLoader").style.display = "none";
    alert("Παρακαλώ εισάγετε όλα τα στοιχεία του λογαριασμού σας.");
  }
}

function showSignIn() {
  document.getElementById("signUp").style.display = "none";
  document.getElementById("signIn").style.display = "flex";
}

function showSignUp() {
  document.getElementById("signIn").style.display = "none";
  document.getElementById("signUp").style.display = "flex";
}
