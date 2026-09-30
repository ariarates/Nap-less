import { router } from "expo-router";
import React, { useEffect } from "react";
import { View } from "react-native";

import { useFace } from "@/contexts/FaceContext";

export default function EntryScreen() {
  const { isRegistered, isLoading } = useFace();

  useEffect(() => {
    if (isLoading) return;
    if (isRegistered) {
      router.replace("/home");
    } else {
      router.replace("/setup");
    }
  }, [isLoading, isRegistered]);

  return <View style={{ flex: 1, backgroundColor: "#080C14" }} />;
}
