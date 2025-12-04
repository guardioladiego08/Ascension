// app/(tabs)/add/Strength/components/CustomExerciseModal.tsx
import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  FlatList,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/Colors";
import { MaterialIcons } from "@expo/vector-icons";

const BODY_PARTS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
  "forearms",
  "full_body",
  "other",
];

// ⬇⬇⬇ INSERT THIS ⬇⬇⬇
const CATEGORIES = [
  "Dumbbell",
  "Barbell",
  "Machine",
  "Cable",
  "Bodyweight",
  "Kettlebell",
  "Band",
  "EZ-Bar",
  "Smith Machine",
  "Medicine Ball",
  "Trap Bar",
  "Cardio Equipment / Conditioning",
  "Suspension / TRX",
];
// ⬆⬆⬆ INSERT THIS ⬆⬆⬆

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};


const CustomExerciseModal: React.FC<Props> = ({ visible, onClose, onSuccess }) => {
  const [name, setName] = useState("");
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);

  const toggleBodyPart = (bp: string) => {
    if (bodyParts.includes(bp)) {
      setBodyParts(bodyParts.filter(x => x !== bp));
    } else {
      setBodyParts([...bodyParts, bp]);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Missing Name", "Please enter an exercise name.");
      return;
    }

    if (bodyParts.length === 0) {
      Alert.alert("Missing Body Parts", "Please select at least one body part.");
      return;
    }

    if (!category) {
      Alert.alert("Missing Category", "Please select a workout category.");
      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !data?.user) {
        throw userError || new Error("Not signed in.");
      }

      const userId = data.user.id;

      const { error } = await supabase.schema('strength').from("exercises").insert({
        exercise_name: name.trim(),
        body_parts: bodyParts,                 // string[] -> body_part[]
        workout_category: category || null,    // enum or null
        info: info.trim() || null,
        user_id: userId,                       // 🔥 explicitly tie to this user
      });

      if (error) {
        // Unique constraint violation: (user_id, exercise_name) already exists
        if (error.code === "23505") {
          Alert.alert(
            "Exercise already exists",
            "You already have an exercise with this name. Try a different name or use the existing exercise in your list."
          );
          return;
        }

        throw error;
      }

      Alert.alert("Success", "Exercise added successfully!");
      onSuccess();

      // optional: clear fields for next time
      setName("");
      setBodyParts([]);
      setCategory("");
      setInfo("");
    } catch (err: any) {
      console.warn("Error inserting custom exercise", err);
      Alert.alert("Error", err?.message ?? "Failed to add exercise.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.modalBox}>
          <Text style={styles.title}>Add Custom Exercise</Text>

          <ScrollView style={{ maxHeight: "78%" }}>
            {/* Exercise Name */}
            <Text style={styles.label}>Exercise Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter name"
              placeholderTextColor="#888"
              value={name}
              onChangeText={setName}
            />

            {/* Body Parts */}
            <Text style={styles.label}>Body Parts</Text>
            <View style={styles.bodyPartWrap}>
              {BODY_PARTS.map(bp => (
                <TouchableOpacity
                  key={bp}
                  onPress={() => toggleBodyPart(bp)}
                  style={[
                    styles.bpBtn,
                    bodyParts.includes(bp) && styles.bpBtnSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.bpText,
                      bodyParts.includes(bp) && { color: "#fff" },
                    ]}
                  >
                    {bp}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category Dropdown */}
            <Text style={styles.label}>Category</Text>

            <TouchableOpacity
              onPress={() => setCategoryDropdownVisible(true)}
              style={styles.dropdownField}
            >
              <Text style={styles.dropdownFieldText}>
                {category || "Select Category"}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={22} color="#ccc" />
            </TouchableOpacity>

            {/* Notes */}
            <Text style={styles.label}>Description / Notes</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Optional description..."
              placeholderTextColor="#777"
              multiline
              value={info}
              onChangeText={setInfo}
            />
          </ScrollView>

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSubmit} style={styles.submitBtn}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* CATEGORY DROPDOWN MODAL */}
      <Modal
        visible={categoryDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryDropdownVisible(false)}
      >
        <View style={styles.dropdownBackdrop}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Category</Text>

            <FlatList
              data={CATEGORIES}
              keyExtractor={item => item}
              style={{ maxHeight: 250 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.dropdownItem, category === item && styles.dropdownSelected]}
                  onPress={() => {
                    setCategory(item);
                    setCategoryDropdownVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      category === item && { color: "#fff" },
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.dropdownCancelBtn}
              onPress={() => setCategoryDropdownVisible(false)}
            >
              <Text style={styles.dropdownCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

export default CustomExerciseModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },

  label: {
    color: "#ccc",
    marginTop: 10,
    fontSize: 13,
  },
  input: {
    backgroundColor: "#1b2337",
    padding: 10,
    borderRadius: 8,
    color: "#fff",
    marginTop: 4,
  },

  /* Body part buttons */
  bodyPartWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  bpBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#2a3350",
    borderRadius: 8,
  },
  bpBtnSelected: { backgroundColor: "#ff950a" },
  bpText: { color: "#ccc", fontSize: 12 },

  /* Category field */
  dropdownField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#1b2337",
    marginTop: 6,
  },
  dropdownFieldText: {
    color: "#fff",
    fontSize: 14,
  },

  btnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  cancelBtn: { padding: 10 },
  cancelText: { color: "#ccc" },
  submitBtn: {
    backgroundColor: "#ff950a",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitText: { color: "#fff", fontWeight: "700" },

  /* Category Dropdown Modal */
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dropdownBox: {
    width: "80%",
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    maxHeight: "70%",
  },
  dropdownTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 10,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#1c253d",
    borderRadius: 8,
    marginVertical: 4,
  },
  dropdownSelected: {
    backgroundColor: "#ff950a",
  },
  dropdownItemText: {
    color: "#ccc",
    fontSize: 14,
  },
  dropdownCancelBtn: {
    marginTop: 14,
    alignItems: "center",
    padding: 10,
  },
  dropdownCancelText: {
    color: "#ccc",
    fontSize: 14,
  },
});
