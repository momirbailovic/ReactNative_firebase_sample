const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

// Take the text parameter passed to this HTTP endpoint and insert it into the
// Realtime Database under the path /messages/:pushId/original
exports.addMessage = functions.https.onRequest(async (req, res) => {
    // Grab the text parameter.
    const original = req.query.text;
    // Push the new message into the Realtime Database using the Firebase Admin SDK.
    const snapshot = await admin.database().ref('/messages').push({original: original});
    // Redirect with 303 SEE OTHER to the URL of the pushed object in the Firebase console.
    res.redirect(303, snapshot.ref.toString());
    });

exports.makeUppercase = functions.database.ref('/messages/{pushId}/original')
    .onCreate((snapshot, context) => {
      // Grab the current value of what was written to the Realtime Database.
      const original = snapshot.val();
      console.log('Uppercasing', context.params.pushId, original);
      const uppercase = original.toUpperCase();
      // You must return a Promise when performing asynchronous tasks inside a Functions such as
      // writing to the Firebase Realtime Database.
      // Setting an "uppercase" sibling in the Realtime Database returns a Promise.
      return snapshot.ref.parent.child('uppercase').set(uppercase);
    });
exports.useMultipleWildcards = functions.firestore
    .document('users/{userId}')
    .onWrite((change, context) => {
      // If we set `/users/marie/incoming_messages/134` to {body: "Hello"} then
      // context.params.userId == "marie";
      // context.params.messageCollectionId == "incoming_messages";
      // context.params.messageId == "134";
      // ... and ...
      // change.after.data() == {body: "Hello"}

      var condition = "'stock-GOOG' in topics || 'industry-tech' in topics";

        // See documentation on defining a message payload.
        var message = {
            notification: {
                title: '$GOOG up 1.43% on the day',
                body: '$GOOG gained 11.80 points to close at 835.67, up 1.43% on the day.'
            },
            condition: condition
        };

        console.log("onWriteKOSU", message)

        return Promise.all(message);
    });
exports.updateUser = functions.firestore
    .document('users/{userId}')
    .onUpdate((change, context) => {
        // Get an object representing the document
        // e.g. {'name': 'Marie', 'age': 66}
        const newValue = change.after.data();

        // ...or the previous value before this update
        const previousValue = change.before.data();

        // access a particular field as you would any JS property
        const name = newValue.name;

        // perform desired operations ...
        console.log("onUpDateKOSU", newValue);

        var payload = {
            notification: {
                title: "you can change me",
                body: "you can change everything",
              }
        };

        admin.messaging().sendToDevice(newValue.onToken, payload)
        .then((response) => {
            console.log("Successfully sent message: ", response);
            return true;
        })
        .catch((error) => {
            console.log("Error sending message: ", error);
            return false;
        })
        //admin.messaging().notification()

        // Send a message to devices subscribed to the combination of topics
        // specified by the provided condition.
  
    });
