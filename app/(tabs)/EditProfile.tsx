import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const EditProfile: React.FC = () => {
  const [form, setForm] = useState({
    firstName: 'Diego',
    lastName: 'Guardiola',
    email: 'diegoguardiola08@gmail.com',
    password: '********',
    birthdate: '04/08/1996',
    gender: 'male',
    height: '5\'11"',
  });

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    console.log('Form Submitted:', form);
    Alert.alert('Saved', 'Profile updated successfully');
  };

  const renderField = (label: string, key: keyof typeof form, secure?: boolean) => (
    <View style={styles.inputGroup} key={key}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={form[key]}
        onChangeText={(text) => handleChange(key, text)}
        secureTextEntry={secure}
      />
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
  
      <Text style={styles.title}>EDIT PROFILE</Text>

      <TouchableOpacity style={styles.profilePicWrapper}>
        <Image
          source={require('../../assets/images/f093d5d.png')}
          style={styles.profileImage}
        />
        <Text style={styles.editPic}>EDIT PICTURE</Text>
      </TouchableOpacity>

      {renderField('FIRST NAME', 'firstName')}
      {renderField('LAST NAME', 'lastName')}
      {renderField('EMAIL', 'email')}
      {renderField('PASSWORD', 'password', true)}
      {renderField('BIRTHDATE', 'birthdate')}
      {renderField('GENDER', 'gender')}
      {renderField('HEIGHT', 'height')}

      <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
        <Text style={styles.saveText}>SAVE</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default EditProfile;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#3f3f3f',
    padding: 20,
    paddingBottom: 50,
    alignItems: 'center',
  },
  logo: {
    height: 40,
    marginBottom: 10,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  profilePicWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  editPic: {
    color: '#fff',
    fontSize: 12,
    marginTop: 6,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 15,
  },
  label: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
  },
  saveButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 6,
    marginTop: 20,
  },
  saveText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
