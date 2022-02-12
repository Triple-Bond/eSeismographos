from pyrebase import pyrebase
import serial.tools.list_ports
import re
import time
from datetime import date


class Seismographos:
    seismograph_id = ''
    seismograph_name = ''

    def __init__(self, seismograph_id, seismograph_name):
        self.seismograph_id = seismograph_id
        self.seismograph_name = seismograph_name


firebase_config = {
    "apiKey": "AIzaSyCMZ64PZL80WmiHd5S-Fg1bPy0GGamCnCQ",
    "authDomain": "e-seismographos.firebaseapp.com",
    "databaseURL": "https://e-seismographos-default-rtdb.europe-west1.firebasedatabase.app",
    "projectId": "e-seismographos",
    "storageBucket": "e-seismographos.appspot.com",
    "messagingSenderId": "779181211465",
    "appId": "1:779181211465:web:3d0f0b68dde7fc84472498"
}

firebase = pyrebase.initialize_app(firebase_config)
auth = firebase.auth()
database = firebase.database()
starting_time = 0

print("Καλώς ήρθατε στο λογισμικό του eSeismographos.")
email = input("Εισάγετε το email σας: ").strip()
password = input("Εισάγετε τον κωδικό σας: ").strip()


def hour_passed():
    return time.time() - starting_time == 3500  # 100 δευτερόλεπτα πριν λήξει η σύνδεση με τον λογαριασμό


def initiate_client():
    seismographs = database.child('users').child(auth.current_user['localId']).child('seismographs').get()

    print('Επιλέξετε ποιον σεισμογράφο συνδέετε:')

    val = 0
    seismograph_ids = []
    seismograph_names = []

    if seismographs.val() is not None:
        for seismograph in seismographs:
            seismograph_ids.append(seismograph.key())
            seismograph_names.append(seismograph.val())
            print(str(val) + ". " + seismograph.val())
            val = val + 1

    print(str(val) + ". Είναι νέος σεισμογράφος, που δεν τον έχω συνδέσει ακόμη.")

    selection = 0

    try:
        selection = int(input())
    except:
        print("Σφάλμα. Πρέπει να εισάγετε αριθμό.")
        initiate_client()

    if selection == val:
        print("Εγγραφή αυτού του σεισμογράφου")
        createSeismograph()
    else:
        if selection > len(seismograph_ids) or selection < 0:
            print("Σφάλμα. Δεν υπάρχει αυτή η επιλογή.")
            initiate_client()
        else:
            seismographos = Seismographos(seismograph_ids[selection], seismograph_names[selection])
            initiate_connection(seismographos)


def createSeismograph():
    name = input("Εισάγετε το όνομα του σεισμογράφου: ")
    api = input("Θέλετε ο σεισμογράφος να είναι διαθέσιμος στους πολίτες; (Ναι ή Όχι) ").lower().strip()
    apiEnable = None

    if api == "όχι" or api == "οχι":
        apiEnable = False
    elif api == "ναι":
        apiEnable = True
    else:
        print("Σφάλμα δεν υπάρχει τέτοια επιλογή.")
        createSeismograph()

    data = {'name': name, 'apiEnable': apiEnable}
    seismograph = database.child('seismographs').push(data)
    seismograph_id = seismograph['name']
    database.child('users').child(auth.current_user['localId']).child('seismographs').child(seismograph_id).set(name)
    seismographos = Seismographos(seismograph_id, name)
    initiate_connection(seismographos)


def initiate_connection(seismographos):
    print("Επιλέξτε τη θύρα που συνδέσατε τον σεισμογράφο (εισάγετε τον αριθμό που βλέπετε στη αρχή):")
    ports = serial.tools.list_ports.comports()

    portList = []

    x = 0
    for port in ports:
        portList.append(str(port))
        print(str(x) + '. ' + str(port))
        x = x + 1

    index = int(input("\nΘύρα επιλογής: "))

    if index > len(portList) or index < 0:
        print("Σφάλμα, δεν υπάρχει αυτή η επιλογή.")
        initiate_connection(seismographos.seismograph_id)
    else:
        selected_port = portList[index]
        selected_port = re.match(r'^.*? ', selected_port).group(0)
        selected_port = selected_port.strip()

        serialInst = serial.Serial()
        serialInst.baudrate = 9600
        serialInst.port = selected_port
        serialInst.open()

        print("Ο σεισμογράφος λειτουργεί...")

        while True:
            if serialInst.in_waiting:
                packet = serialInst.readline()
                val = float(packet.decode('utf-8'))
                #check_measurement(val, seismographos)
                if hour_passed():
                    auth.refresh(auth.current_user['refreshToken'])
                dateKey = str(date.today())
                data = {'r': val, 'timestamp': time.time()}
                database.child('data').child(seismographos.seismograph_id).child('live-data').set(data)
                database.child('data').child(seismographos.seismograph_id).child('data').child(dateKey).push(data)


# Early-warning system
# Not accurate, just for experimenting, still in production mode
threshold = 6
base = -18


def check_measurement(val, seismographos):
    if val > (base + threshold) or val < (base - threshold):
        title = 'Σεισμός'
        body = 'Σεισμός εντοπίστηκε από τον σεισμογράφο: ' + seismographos.seismograph_name
        alert = 'low'

        if val > (base + threshold * 4) or val < (base - threshold * 4):
            alert = 'medium'

            if val > (base + threshold * 10) or val < (base - threshold * 10):
                alert = 'high'

        announcement = {'alert': alert, 'body': body, 'timestamp': time.time(), 'title': title}
        database.child('announcements').push(announcement)



auth.sign_in_with_email_and_password(email, password)
print("Επιτυχής σύνδεση.")
starting_time = time.time()
initiate_client()

