import { useState } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View, Pressable } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { colors, radius } from "@/theme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
}

export function Input({ label, error, isPassword, style, ...props }: InputProps) {
  const [hidden, setHidden] = useState(!!isPassword);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, error && styles.inputError, style]}
          placeholderTextColor={colors.navy300}
          secureTextEntry={hidden}
          autoCapitalize="none"
          {...props}
        />
        {isPassword && (
          <Pressable onPress={() => setHidden((v) => !v)} style={styles.eyeButton}>
            {hidden ? (
              <Eye size={18} color={colors.navy400} />
            ) : (
              <EyeOff size={18} color={colors.navy400} />
            )}
          </Pressable>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: colors.navy800 },
  inputRow: { position: "relative", justifyContent: "center" },
  input: {
    borderWidth: 1,
    borderColor: colors.navy100,
    backgroundColor: "#fff",
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: colors.navy900,
  },
  inputError: { borderColor: colors.rose500 },
  eyeButton: { position: "absolute", right: 14 },
  errorText: { fontSize: 12, fontWeight: "600", color: colors.rose500 },
});
