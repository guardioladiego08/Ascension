import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GlobalStyles } from '@/constants/GlobalStyles';

const ProfileCard = () => {
  const router = useRouter();

  const handlePress = () => {
    router.push('/(tabs)/EditProfile'); // File-based routing
  };

  return (
    <TouchableOpacity style={GlobalStyles.container} onPress={handlePress}>
      <View style={styles.ProfileContainer}>
        <Image
          source={require('../../../assets/images/f093d5d.png')}
          style={styles.image}
        />
        <View>
          <Text style={GlobalStyles.title}>DIEGO</Text>
          <Text style={GlobalStyles.title}>GUARDIOLA</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ProfileCard;

const styles = StyleSheet.create({
  ProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  }
});
