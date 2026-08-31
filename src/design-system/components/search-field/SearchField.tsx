/**
 * SearchField — search input with icon and clear button.
 *
 * Usage:
 *   <MagnifyingGlassIconField placeholder="검색어를 입력하세요" value={text} onChangeText={setText} />
 */
import React, { forwardRef, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { MagnifyingGlassIcon, XCircleIcon } from 'phosphor-react-native';
import { useAdaptive } from '../../core';
import { useControlled } from '../../utils';

export interface SearchFieldProps extends Omit<TextInputProps, 'style'> {
  value?: string;
  defaultValue?: string;
  onChangeText?: (text: string) => void;
  /** @default false */
  hasClearButton?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const SearchField = forwardRef<TextInput, SearchFieldProps>(function SearchField(
  {
    value: _value,
    defaultValue,
    onChangeText,
    hasClearButton = false,
    style,
    placeholder,
    ...rest
  },
  ref,
) {
  const adaptive = useAdaptive();
  const [value, setValue] = useControlled({
    controlledValue: _value,
    defaultValue: defaultValue ?? '',
  });

  const handleChangeText = useCallback(
    (text: string) => {
      setValue(text);
      onChangeText?.(text);
    },
    [setValue, onChangeText],
  );

  const handleClear = useCallback(() => {
    setValue('');
    onChangeText?.('');
  }, [setValue, onChangeText]);

  const showClear = hasClearButton && value.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: adaptive.grey100 }, style]}>
      <View style={styles.iconLeft}>
        <MagnifyingGlassIcon size={20} color={adaptive.grey400} />
      </View>
      <TextInput
        ref={ref}
        style={[styles.input, { color: adaptive.grey900 }]}
        value={value}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        placeholderTextColor={adaptive.grey400}
        returnKeyType="search"
        allowFontScaling={false}
        // A query is matched against 촬영지, 지역 and 최애 names, not written as
        // prose — capitalising or correcting it only moves it away from what is
        // stored. Before the spread, so a caller that wants either can say so.
        autoCapitalize="none"
        autoCorrect={false}
        {...rest}
      />
      {showClear && (
        <Pressable onPress={handleClear} style={styles.clearButton} hitSlop={8}>
          <XCircleIcon size={20} color={adaptive.grey300} weight="fill" />
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  iconLeft: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  clearButton: {
    marginLeft: 8,
  },
});
