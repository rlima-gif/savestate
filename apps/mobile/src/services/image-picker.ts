import * as ImagePicker from 'expo-image-picker';

export interface PickedImageResult {
  uri: string;
  base64: string;
  mimeType: string;
  width: number;
  height: number;
}

export const ImageService = {
  async takePhoto(): Promise<PickedImageResult | null> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permissão para usar a câmera não concedida.');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true, // Crop & preview
      aspect: [16, 9],
      quality: 0.7, // Good compression preserving readable text
      base64: true,
      exif: false, // Strips location & private camera metadata
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      base64: asset.base64 || '',
      mimeType: asset.mimeType || 'image/jpeg',
      width: asset.width,
      height: asset.height,
    };
  },

  async pickFromGallery(): Promise<PickedImageResult | null> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permissão para acessar as fotos não concedida.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, // Crop & preview
      quality: 0.7,
      base64: true,
      exif: false, // Strips location & metadata
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      base64: asset.base64 || '',
      mimeType: asset.mimeType || 'image/jpeg',
      width: asset.width,
      height: asset.height,
    };
  },
};
