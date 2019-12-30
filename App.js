import React, {Component} from 'react';
import {  
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  FlatList,
  AsyncStorage,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';

import ImagePicker from 'react-native-image-picker';
import uuid from 'uuid/v4'; // Import UUID to generate UUID

import * as firebase from 'react-native-firebase';


const options = {
  title: 'Select Image',
  storageOptions: {
    skipBackup: true,
    path: 'images'
  }
};
const ImageRow = ({ image, windowWidth, popImage }) => (
  <View>
    <Image
      source={{ uri: image }}
      style={[styles.img, { width: windowWidth / 2 - 15 }]}
      onError={popImage}
    />
  </View>
);

export default class App extends Component {
  constructor (props) {
    super (props);
    this.state = {
      imagepath: '',
      dwnImage: '',
      imgSource: '',
      uploading: false,
      progress: 0,
      images: [],
    }
  }

  componentWillMount () {
    this.getFCMToken();
    this.checkNotificationPermission();
  }

  componentDidMount () {
    this.createAndroidNotificationChannel();

    this.onTokenRefresh = firebase.messaging().onTokenRefresh(fcmToken => {
        console.log('NEW TOKEN: ', fcmToken);
    });

    this.messageListener = firebase.messaging().onMessage((message) => {
      console.log('Remote message:', message);
      //firebase.notifications().displayNotification(message.notification);
    })

    this.notificationListener = firebase.notifications().onNotification((notification) => {
        notification.setData(notification.data)
        .android.setPriority(firebase.notifications.Android.Priority.Max)
        .android.setChannelId('channelId');

        firebase.notifications().displayNotification(notification);
    });

    // let images;
    // AsyncStorage.getItem('images')
    //   .then(data => {
    //     images = JSON.parse(data) || [];
    //     this.setState({
    //       images: images
    //     });
    //   })
    //   .catch(error => {
    //     console.log(error);
    //   });


  }

  createAndroidNotificationChannel () {
    const channel = new firebase.notifications.Android.Channel(
      'channelId',
      'Default Notification',
      firebase.notifications.Android.Importance.High 
    ).setDescription('A natural description of the channel');
    firebase.notifications().android.createChannel(channel);
  }

  getFCMToken = () => {
    firebase.messaging().getToken()
    .then(fcmToken => {
      if (fcmToken) {
        console.log('DEVICE TOKEN:', fcmToken);
      } 
    }).catch(() => {
        console.error('DEVICE TOKEN ERROR:', fcmToken);
      });
  }

  checkNotificationPermission = () => {
    firebase.messaging().hasPermission().then(enabled => {
      if (!enabled) {
        this.promptForNotificationPermission ();
      }
    });
  }

  promptForNotificationPermission = () => {
    firebase.messaging().requestPermission().then(()=>{
      console.log('Permission granted.');
    }).catch(() => {
        console.log('Permission rejected.');
      });
  }

  /**
   * Select image method
   */
  pickImage = () => {
    ImagePicker.showImagePicker(options, response => {
      if (response.didCancel) {
        console.log('You cancelled image picker 😟');
      } else if (response.error) {
        alert('And error occured: ', response.error);
      } else {
        const source = { uri: response.uri };
        this.setState({
          imgSource: source,
          imageUri: response.uri
        });
      }
    });
  };
  /**
   * Upload image method
   */
  uploadImage = () => {
    const ext = this.state.imageUri.split('.').pop(); // Extract image extension
    const filename = `${uuid()}.${ext}`; // Generate unique name
    this.state.imagepath = filename;
    this.setState({ uploading: true });
    firebase
      .storage()
      .ref(this.state.imagepath)
      .putFile(this.state.imageUri)
      .on(
        firebase.storage.TaskEvent.STATE_CHANGED,
        snapshot => {
          let state = {};
          state = {
            ...state,
            progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100 // Calculate progress percentage
          };
          if (snapshot.state === firebase.storage.TaskState.SUCCESS) {
            const allImages = this.state.images;
            allImages.push(snapshot.downloadURL);
            state = {
              ...state,
              uploading: false,
              imgSource: '',
              imageUri: '',
              progress: 0,
              images: allImages
            };
            AsyncStorage.setItem('images', JSON.stringify(allImages));
          }
          this.setState(state);
        },
        error => {
          unsubscribe();
          alert('Sorry, Try again.');
        }
      );
      this.getImage();
  };

  getImage = () => {
    Alert.alert(this.state.imagepath); 
    firebase
      .storage()
      .ref(this.state.imagepath)
      .getDownloadURL()
      .then((url) => {
          this.setState({dwnImage:url});
      })
      .catch((error) => {
        Alert.alert('error')
      })   
    Alert.alert(this.state.dwnImage);
  }

  /**
   * Remove image from the state and persistance storage
   */
  removeImage = imageIndex => {
    let images = this.state.images;
    images.pop(imageIndex);
    this.setState({ images });
    AsyncStorage.setItem('images', JSON.stringify(images));
  };

  render() {
    const { uploading, imgSource, progress, images } = this.state;
    const windowWidth = Dimensions.get('window').width;
    const disabledStyle = uploading ? styles.disabledBtn : {};
    const actionBtnStyles = [styles.btn, disabledStyle];
    return (
      <View>
        <ScrollView>
          <View style={styles.Imgpick}>
            <TouchableOpacity
              style={actionBtnStyles}
              onPress={this.pickImage}
              disabled={uploading}
            >
              <View>
                <Text style={styles.btnTxt}>Pick image</Text>
              </View>
            </TouchableOpacity>
            {/** Display selected image */}
            {imgSource !== '' && (
              <View>
                <Image source={imgSource} style={styles.image} />
                {uploading && (
                  <View
                    style={[styles.progressBar, { width: `${progress}%` }]}
                  />
                )}
                <TouchableOpacity
                  style={actionBtnStyles}
                  onPress={this.uploadImage}
                  disabled={uploading}
                >
                  <View>
                    {uploading ? (
                      <Text style={styles.btnTxt}>Uploading ...</Text>
                    ) : (
                      <Text style={styles.btnTxt}>Upload image</Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            )}
            <View>
                <TouchableOpacity
                  style={actionBtnStyles}
                  onPress={this.getImage}
                >
                  <View>
                      <Text style={styles.btnTxt}>download image</Text>
                  </View>
                </TouchableOpacity>
            </View>
            <View>
              <Text
                style={{
                  fontWeight: '600',
                  paddingTop: 20,
                  alignSelf: 'center'
                }}
              >
                {images.length > 0
                  ? 'Your uploaded images' + images.length
                  : 'There is no image you uploaded'}
              </Text>
            </View>
            <View>
              <Image
                source={{ uri: this.state.dwnImage }}
                style={[styles.img, { width: windowWidth / 2 - 15 }]}
              />
            </View>
            {/* <FlatList
              numColumns={2}
              style={{ marginTop: 20 }}
              data={images}
              renderItem={({ item: image, index }) => (
                <ImageRow
                  windowWidth={windowWidth}
                  image={image}
                  popImage={() => this.removeImage(index)}
                />
              )}
              keyExtractor={index => index}
            /> */}
          </View>
        </ScrollView>
      </View>
    );
  }

}

const styles = StyleSheet.create({
  Imgpick: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    marginTop: 20,
    paddingLeft: 5,
    paddingRight: 5
  },
  btn: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 20,
    backgroundColor: 'rgb(3, 154, 229)',
    marginTop: 20,
    alignItems: 'center'
  },
  disabledBtn: {
    backgroundColor: 'rgba(3,155,229,0.5)'
  },
  btnTxt: {
    color: '#fff'
  },
  image: {
    marginTop: 20,
    minWidth: 200,
    height: 200,
    resizeMode: 'contain',
    backgroundColor: '#ccc',
  },
  img: {
    //flex: 1,
    height: 100,
    margin: 5,
    resizeMode: 'contain',
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#ccc'
  },
  progressBar: {
    backgroundColor: 'rgb(3, 154, 229)',
    height: 3,
    shadowColor: '#000',
  }
});
