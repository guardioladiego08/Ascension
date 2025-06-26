import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ProfileCard = () => {
  const router = useRouter();

  const handlePress = () => {
    router.push('/(tabs)/EditProfile'); // File-based routing
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Image
        source={require('../../assets/images/f093d5d.png')}
        style={styles.image}
      />
      <View>
        <Text style={styles.nameTop}>DIEGO</Text>
        <Text style={styles.nameBottom}>GUARDIOLA</Text>
      </View>
    </TouchableOpacity>
  );
};

export default ProfileCard;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#444',
    padding: 12,
    borderRadius: 10,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  nameTop: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    borderBottomWidth: 3,
    borderBottomColor: '#0EA5FF',
    marginBottom: 4,
    width: 90,
  },
  nameBottom: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    borderBottomWidth: 3,
    borderBottomColor: '#0EA5FF',
    width: 140,
  },
});
