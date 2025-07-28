import { Colors } from '@/constants/Colors';
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
        source={require('../../../assets/images/f093d5d.png')}
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
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 30,
    paddingRight: 30,
    borderRadius: 10,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  nameTop: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    width: 90,
  },
  nameBottom: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: 'bold',
    width: 140,
  },
});
