/**
 * Animatrona TV — главный компонент приложения
 */

import { NavigationContainer } from '@react-navigation/native'
import React from 'react'
import { StatusBar, StyleSheet, View } from 'react-native'

import { TVNavigator } from '@/navigation/TVNavigator'

/** Главный компонент приложения */
export default function App(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <NavigationContainer>
        <TVNavigator />
      </NavigationContainer>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
})
