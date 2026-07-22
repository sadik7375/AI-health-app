import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  StatusBar, Modal, Animated, Easing, Share, Alert, Dimensions,
  Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as ImagePicker from 'expo-image-picker';
import { healthStore, LabReport, LabParameter } from '../store/healthStore';
import { BASE_URL } from '../api/apiClient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

type Nav = NativeStackNavigationProp<RootStackParamList, 'LabReport'>;
interface Props { navigation: Nav; }



const REPORT_TYPES = ['Blood Test', 'Urine Test', 'X-Ray', 'MRI', 'CT Scan', 'ECG', 'Other'];
const STATUS_FILTERS = ['All', 'Normal', 'High', 'Low', 'Pending'] as const;

// ── Simulated mock images (colored rectangles) ────────────────────
const MOCK_IMAGE_COLORS = ['#D1FAE5', '#DBEAFE', '#FEF3C7', '#EDE9FE'];

// ════════════════════════════════════════════════════════════════
export default function LabReportScreen({ navigation }: Props) {
  const [tab,     setTab]     = useState<'All Reports' | 'Scan & Upload'>('All Reports');
  const [filter,  setFilter]  = useState<typeof STATUS_FILTERS[number]>('All');
  const [reports, setReports] = useState<LabReport[]>([]);

  // Sync with healthStore on mount
  useEffect(() => {
    const unsubscribe = healthStore.subscribe(() => {
      setReports([...healthStore.getLabReports()]);
    });
    setReports([...healthStore.getLabReports()]);
    return unsubscribe;
  }, []);

  const getFullImageUri = (uri?: string) => {
    if (!uri) return undefined;
    if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('file://') || uri.startsWith('data:')) {
      return uri;
    }
    const host = BASE_URL.replace('/api', '');
    return `${host}${uri}`;
  };

  // Detail view
  const [selectedReport, setSelectedReport] = useState<LabReport | null>(null);
  const [detailTab,      setDetailTab]      = useState<'Image' | 'Data'>('Data');
  const [showFullScreenReportImg, setShowFullScreenReportImg] = useState(false);

  // Scan flow
  const [scanStep,      setScanStep]      = useState<'Idle' | 'Scanning' | 'Processing' | 'Form'>('Idle');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePath,     setImagePath]     = useState<string | null>(null);
  
  const [reportName,    setReportName]    = useState('');
  const [reportType,    setReportType]    = useState('Blood Test');
  const [labName,       setLabName]       = useState('');
  const [testDate,      setTestDate]      = useState('');
  const [notes,         setNotes]         = useState('');
  const [extractedOCR,  setExtractedOCR]  = useState('');
  const [ocrData,       setOcrData]       = useState<LabParameter[]>([]);
  const [reportStatus,  setReportStatus]  = useState<LabReport['status']>('Normal');

  const scanAnim  = useRef(new Animated.Value(0)).current;
  const progAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const filtered = filter === 'All' ? reports : reports.filter(r => r.status === filter);

  // Camera & Gallery actions
  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Gallery access permission is required to upload a lab report.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0].uri) {
      setSelectedImage(result.assets[0].uri);
      setScanStep('Scanning');
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Camera access permission is required to capture a lab report.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0].uri) {
      setSelectedImage(result.assets[0].uri);
      setScanStep('Scanning');
    }
  };

  // ── Scan API Action ──────────────────────────────────────────
  const startScan = async () => {
    if (!selectedImage) return;
    setScanStep('Processing');
    progAnim.setValue(0);

    // Animate progress up to 90%
    Animated.timing(progAnim, {
      toValue: 0.9,
      duration: 3500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    // Call actual backend scan API
    const res = await healthStore.scanLabReport(selectedImage, reportType);

    if (res && res.success) {
      const ext = res.extraction;
      setImagePath(res.image_path);
      setReportName(ext.name || 'Lab Report');
      setLabName(ext.lab_name || '');
      setTestDate(ext.report_date || new Date().toISOString().substring(0, 10));
      setNotes(ext.notes || '');
      setExtractedOCR(ext.rawText || '');
      setOcrData(ext.parameters || []);
      setReportStatus(ext.status || 'Normal');

      // Finish progress bar animation
      Animated.timing(progAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        setScanStep('Form');
      });
    } else {
      Alert.alert('Scan Failed', 'AI could not process this lab report image. Please try again or capture a clearer image.');
      setScanStep('Scanning');
    }
  };

  const resetScan = () => {
    setScanStep('Idle');
    setSelectedImage(null);
    setImagePath(null);
    scanAnim.setValue(0);
    progAnim.setValue(0);
    fadeAnim.setValue(0);
    setReportName('');
    setLabName('');
    setTestDate('');
    setNotes('');
    setExtractedOCR('');
    setOcrData([]);
    setReportStatus('Normal');
  };

  const saveReport = async () => {
    if (!reportName.trim()) {
      Alert.alert('Error', 'Please provide a report name.');
      return;
    }
    
    // Call actual save to backend
    const payload = {
      name: reportName.trim(),
      lab_name: labName.trim() || 'Diagnostic Lab',
      report_type: reportType,
      report_date: testDate || new Date().toISOString().substring(0, 10),
      status: reportStatus,
      parameters: ocrData,
      notes: notes.trim(),
      image_path: imagePath || undefined,
    };

    const res = await healthStore.saveLabReport(payload);
    if (res && res.success) {
      resetScan();
      setTab('All Reports');
      if (res.report) {
        setSelectedReport(res.report);
      }
    } else {
      Alert.alert('Error', 'Failed to save lab report. Please check your inputs.');
    }
  };

  const handleShare = async (report: LabReport) => {
    try {
      // Build beautiful HTML report content
      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 30px; color: #1a202c; }
              .header { border-bottom: 2px solid #edf2f7; padding-bottom: 16px; margin-bottom: 24px; }
              .title { font-size: 24px; font-weight: 800; color: #4f46e5; margin: 0; }
              .lab-name { font-size: 14px; color: #4a5568; margin-top: 6px; font-weight: 600; }
              .meta-row { display: flex; justify-content: space-between; margin-bottom: 24px; }
              .meta-item { background: #f7fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; color: #4a5568; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; }
              th { background-color: #f7fafc; color: #718096; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; }
              td { padding: 12px; border-bottom: 1px solid #edf2f7; font-size: 13px; color: #2d3748; }
              .flag-high { color: #ef4444; font-weight: 700; background: #fee2e2; padding: 2px 6px; border-radius: 4px; display: inline-block; }
              .flag-low { color: #3b82f6; font-weight: 700; background: #dbeafe; padding: 2px 6px; border-radius: 4px; display: inline-block; }
              .flag-normal { color: #10b981; font-weight: 700; background: #ecfdf5; padding: 2px 6px; border-radius: 4px; display: inline-block; }
              .notes-section { margin-top: 32px; background: #faf5ff; border: 1px solid #e9d8fd; padding: 16px; border-radius: 12px; }
              .notes-title { font-size: 14px; font-weight: 800; color: #6b46c1; margin-bottom: 8px; }
              .notes-text { font-size: 13px; line-height: 1.6; color: #4a5568; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 class="title">${report.name}</h1>
              <div class="lab-name">Clinic/Laboratory: ${report.lab}</div>
            </div>
            
            <div class="meta-row">
              <div class="meta-item"><strong>Date:</strong> ${report.date}</div>
              <div class="meta-item"><strong>Report Type:</strong> ${report.type}</div>
              <div class="meta-item"><strong>Status:</strong> ${report.status}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Test Parameter</th>
                  <th>Value</th>
                  <th>Reference Range</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${(report.ocrData || []).map(p => `
                  <tr>
                    <td><strong>${p.label}</strong></td>
                    <td>${p.value}</td>
                    <td>${p.refRange || '—'}</td>
                    <td><span class="${p.flag === 'High' ? 'flag-high' : (p.flag === 'Low' ? 'flag-low' : 'flag-normal')}">${p.flag || 'Normal'}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            ${report.notes ? `
              <div class="notes-section">
                <div class="notes-title">Clinical Notes / Summary</div>
                <div class="notes-text">${report.notes}</div>
              </div>
            ` : ''}
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: report.name });
    } catch (err) {
      console.warn("Failed to generate and share PDF:", err);
      // Fallback sharing as text
      try {
        await Share.share({
          title: report.name,
          message:
            `📋 Lab Report: ${report.name}\n` +
            `🏥 Lab: ${report.lab}\n` +
            `📅 Date: ${report.date}\n` +
            `🔬 Type: ${report.type}\n` +
            `✅ Status: ${report.status}`,
        });
      } catch (_) {}
    }
  };

  const handleDownload = (report: LabReport) => {
    Alert.alert(
      'Download Report',
      `"${report.name}" has been saved to your device as PDF.`,
      [{ text: 'OK' }]
    );
  };

  const handlePrint = (report: LabReport) => {
    Alert.alert(
      'Print Report',
      'Sending to printer...\n\nMake sure your device is connected to a printer.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Print', onPress: () => {} }]
    );
  };

  const progWidth = progAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const scanY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 180] });

  const statusColor: Record<string, string> = { Normal: '#059669', High: '#EF4444', Low: '#3B82F6', Pending: '#718096' };
  const statusBg:    Record<string, string> = { Normal: '#ECFDF5', High: '#FEE2E2', Low: '#EFF6FF', Pending: '#F1F5F9' };

  // ════════════════════════════════════════════════════════════════
  // Detail View Modal
  // ════════════════════════════════════════════════════════════════
  if (selectedReport) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FF" />

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => setSelectedReport(null)}>
            <Feather name="arrow-left" size={22} color="#1A202C" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.headerTitle} numberOfLines={1}>{selectedReport.name}</Text>
            <Text style={s.headerSub}>{selectedReport.lab} • {selectedReport.date}</Text>
          </View>
          <View style={[s.statusPill, { backgroundColor: statusBg[selectedReport.status] }]}>
            <Text style={[s.statusPillText, { color: statusColor[selectedReport.status] }]}>
              {selectedReport.status}
            </Text>
          </View>
        </View>

        {/* Action Row */}
        <View style={s.actionBar}>
          <ActionBtn icon="download" label="Download" color="#3B82F6" onPress={() => handleDownload(selectedReport)} />
          <ActionBtn icon="share-2"  label="Share PDF"  color="#4F46E5" onPress={() => handleShare(selectedReport)} />
        </View>

        {/* Detail Tabs */}
        <View style={s.detailTabRow}>
          {(['Data', 'Image'] as const).map(t => (
            <TouchableOpacity key={t} style={[s.detailTab, detailTab === t && s.detailTabActive]} onPress={() => setDetailTab(t)}>
              <Text style={[s.detailTabText, detailTab === t && s.detailTabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={s.detailScroll} showsVerticalScrollIndicator={false}>
          {detailTab === 'Data' && (
            <>
              <View style={s.ocrDataCard}>
                <View style={s.ocrDataHeader}>
                  <MaterialCommunityIcons name="flask-outline" size={18} color="#4F46E5" />
                  <Text style={s.ocrDataHeaderText}>Extracted Test Results</Text>
                </View>
                {(selectedReport.ocrData || []).map((d, i) => (
                  <View key={i} style={s.ocrDataRow}>
                    <Text style={s.ocrDataLabel}>{d.label}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={s.ocrDataValue}>{d.value}</Text>
                      {d.flag && (
                        <View style={[s.flagBadge, { backgroundColor: statusBg[d.flag] }]}>
                          <Text style={[s.flagText, { color: statusColor[d.flag] }]}>{d.flag}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              <View style={s.infoCard}>
                {[
                  { label: 'Report Name', value: selectedReport.name },
                  { label: 'Test Type',   value: selectedReport.type },
                  { label: 'Date',        value: selectedReport.date },
                  { label: 'Laboratory',  value: selectedReport.lab },
                  { label: 'Status',      value: selectedReport.status },
                ].map(r => (
                  <View key={r.label} style={s.infoRow}>
                    <Text style={s.infoLabel}>{r.label}</Text>
                    <Text style={s.infoValue}>{r.value}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {detailTab === 'Image' && (
            <View>
              {selectedReport.imageUri ? (
                <>
                  <Image 
                    source={{ uri: getFullImageUri(selectedReport.imageUri) }} 
                    style={{ width: '100%', height: 350, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' }}
                    resizeMode="contain"
                  />
                  <View style={s.imageActionsRow}>
                    <TouchableOpacity style={s.imgActionBtn} onPress={() => handleDownload(selectedReport)}>
                      <Feather name="download" size={18} color="#3B82F6" />
                      <Text style={[s.imgActionText, { color: '#3B82F6' }]}>Download</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.imgActionBtn} onPress={() => setShowFullScreenReportImg(true)}>
                      <Feather name="eye" size={18} color="#4F46E5" />
                      <Text style={[s.imgActionText, { color: '#4F46E5' }]}>Preview</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={s.noImageWrap}>
                  <MaterialCommunityIcons name="image-off-outline" size={52} color="#CBD5E0" />
                  <Text style={s.noImageText}>No scanned image available</Text>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>

        {/* Full Screen Image Modal */}
        <Modal visible={showFullScreenReportImg} transparent={true} animationType="fade" onRequestClose={() => setShowFullScreenReportImg(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity 
              style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }}
              onPress={() => setShowFullScreenReportImg(false)}
            >
              <Feather name="x" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            {selectedReport.imageUri && (
              <Image 
                source={{ uri: getFullImageUri(selectedReport.imageUri) }} 
                style={{ width: '95%', height: '80%' }}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Main Screen
  // ════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FF" />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color="#1A202C" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Lab Reports</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tab Toggle */}
      <View style={s.tabWrap}>
        {(['All Reports', 'Scan & Upload'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]}
            onPress={() => { setTab(t); if (t === 'All Reports') resetScan(); }}>
            {t === 'Scan & Upload' && (
              <MaterialCommunityIcons name="camera-outline" size={14} color={tab === t ? '#FFFFFF' : '#6366F1'} style={{ marginRight: 5 }} />
            )}
            <Text style={[s.tabBtnText, tab === t && s.tabBtnTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── All Reports Tab ── */}
      {tab === 'All Reports' ? (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Stats */}
          <View style={s.statsRow}>
            <StatChip label="Total"   value={reports.length.toString()} color="#4F46E5" bg="#EEF2FF" />
            <StatChip label="Normal"  value={reports.filter(r => r.status === 'Normal').length.toString()}  color="#059669" bg="#ECFDF5" />
            <StatChip label="High"    value={reports.filter(r => r.status === 'High').length.toString()}    color="#EF4444" bg="#FEE2E2" />
            <StatChip label="Pending" value={reports.filter(r => r.status === 'Pending').length.toString()} color="#718096" bg="#F1F5F9" />
          </View>

          {/* Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
            {STATUS_FILTERS.map(f => (
              <TouchableOpacity key={f} style={[s.filterChip, filter === f && s.filterChipActive]} onPress={() => setFilter(f)}>
                <Text style={[s.filterText, filter === f && s.filterTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>



          {/* Report List */}
          {filtered.length === 0 ? (
            <View style={s.emptyWrap}>
              <MaterialCommunityIcons name="flask-empty-outline" size={52} color="#CBD5E0" />
              <Text style={s.emptyTitle}>No {filter} reports found</Text>
              <Text style={s.emptySub}>Scan a report to get started</Text>
            </View>
          ) : (
            filtered.map(r => (
              <TouchableOpacity key={r.id} style={s.reportCard} activeOpacity={0.85}
                onPress={() => { setSelectedReport(r); setDetailTab('Data'); }}>
                <View style={[s.reportImgThumb, { backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' }]}>
                  {r.imageUri ? (
                    <Image source={{ uri: getFullImageUri(r.imageUri) }} style={{ width: '100%', height: '100%', borderRadius: 14 }} />
                  ) : (
                    <MaterialCommunityIcons name="flask-outline" size={22} color="#4F46E5" />
                  )}
                </View>
                <View style={s.reportInfo}>
                  <Text style={s.reportName}>{r.name}</Text>
                  <Text style={s.reportMeta}>{r.date} • {r.lab}</Text>
                  <View style={[s.typeBadge]}>
                    <Text style={s.typeBadgeText}>{r.type}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <View style={[s.statusBadge, { backgroundColor: statusBg[r.status] }]}>
                    <Text style={[s.statusText, { color: statusColor[r.status] }]}>{r.status}</Text>
                  </View>
                  <TouchableOpacity style={s.viewBtn}
                    onPress={() => { setSelectedReport(r); setDetailTab('Data'); }}>
                    <Text style={s.viewBtnText}>View</Text>
                    <Feather name="chevron-right" size={12} color="#4F46E5" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        /* ── Scan & Upload Tab ── */
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── Step: Idle ── */}
          {scanStep === 'Idle' && (
            <>
              {/* Camera Scan Box */}
              <TouchableOpacity style={s.scanBox} onPress={takePhoto} activeOpacity={0.88}>
                <View style={s.scanFrame}>
                  {/* Corner decorations */}
                  <View style={[s.corner, s.cornerTL]} />
                  <View style={[s.corner, s.cornerTR]} />
                  <View style={[s.corner, s.cornerBL]} />
                  <View style={[s.corner, s.cornerBR]} />
                  <MaterialCommunityIcons name="camera-outline" size={52} color="#4F46E5" style={{ marginBottom: 14 }} />
                  <Text style={s.scanBoxTitle}>Take Photo of Lab Report</Text>
                  <Text style={s.scanBoxSub}>Point camera at the report to scan</Text>
                </View>
              </TouchableOpacity>

              <View style={s.orRow}>
                <View style={s.orLine} />
                <Text style={s.orText}>OR</Text>
                <View style={s.orLine} />
              </View>

              {/* Gallery Upload */}
              <TouchableOpacity style={s.galleryBtn} onPress={pickFromGallery} activeOpacity={0.85}>
                <Feather name="image" size={20} color="#4F46E5" style={{ marginRight: 10 }} />
                <Text style={s.galleryBtnText}>Choose from Gallery</Text>
              </TouchableOpacity>

              <Text style={s.supportedText}>Supported: JPG, PNG, WEBP, PDF</Text>

              {/* Tips */}
              <View style={s.tipsCard}>
                <Text style={s.tipsTitle}>📷 Tips for best results</Text>
                {[
                  'Ensure good lighting when scanning',
                  'Keep the document flat and stable',
                  'Make sure all text is clearly visible',
                  'Avoid shadows on the report',
                ].map((tip, i) => (
                  <View key={i} style={s.tipRow}>
                    <View style={s.tipDot} />
                    <Text style={s.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ── Step: Scanning ── */}
          {scanStep === 'Scanning' && (
            <View style={s.scanningWrap}>
              <Text style={s.scanStepTitle}>Preview Selected Scan</Text>
              <View style={s.scanningBox}>
                {selectedImage && (
                  <Image 
                    source={{ uri: selectedImage }} 
                    style={{ width: '100%', height: '100%', borderRadius: 18 }} 
                    resizeMode="contain"
                  />
                )}
                <Animated.View style={[s.scanLine, { transform: [{ translateY: scanY }] }]} />
              </View>
              <Text style={s.scanStepSub}>Please verify if the report image is readable</Text>
              
              <View style={{ flexDirection: 'row', gap: 12, width: '100%', marginTop: 24 }}>
                <TouchableOpacity 
                  style={[s.galleryBtn, { flex: 1, backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderWidth: 1, marginTop: 0 }]} 
                  onPress={resetScan}
                >
                  <Text style={{ color: '#4A5568', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[s.galleryBtn, { flex: 1, backgroundColor: '#4F46E5', marginTop: 0 }]} 
                  onPress={startScan}
                >
                  <Feather name="cpu" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Scan Report</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Step: Processing (OCR) ── */}
          {scanStep === 'Processing' && (
            <View style={s.processingWrap}>
              <View style={s.aiIconWrap}>
                <MaterialCommunityIcons name="brain" size={40} color="#4F46E5" />
              </View>
              <Text style={s.processingTitle}>AI is Reading Your Report...</Text>
              <Text style={s.processingSub}>Extracting values using Multimodal Gemini</Text>

              <View style={s.progressTrack}>
                <Animated.View style={[s.progressBar, { width: progWidth }]} />
              </View>

              {[
                'Detecting text regions...',
                'Extracting test values...',
                'Classifying biochemical markers...',
                'Generating report summary...',
              ].map((step, i) => (
                <View key={i} style={s.aiStep}>
                  <Feather name="check-circle" size={14} color="#4F46E5" style={{ marginRight: 8 }} />
                  <Text style={s.aiStepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Step: Form (after OCR) ── */}
          {scanStep === 'Form' && (
            <View>
              {/* OCR Preview */}
              <View style={s.ocrPreviewCard}>
                <View style={s.ocrPreviewHeader}>
                  <View style={[s.mockThumb, { backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' }]}>
                    {selectedImage ? (
                      <Image 
                        source={{ uri: selectedImage }} 
                        style={{ width: '100%', height: '100%', borderRadius: 8 }} 
                        resizeMode="contain"
                      />
                    ) : (
                      <MaterialCommunityIcons name="file-document-outline" size={24} color="#4F46E5" />
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.ocrPreviewLabel}>AI Scan Complete ✅</Text>
                    <Text style={s.ocrPreviewSub}>Review and edit the extracted parameters below</Text>
                  </View>
                  <TouchableOpacity onPress={resetScan}>
                    <Feather name="refresh-cw" size={18} color="#6366F1" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Form */}
              <Text style={s.formSectionTitle}>Confirm Report Details</Text>

              <UploadField label="Report Name *" icon="file-text" placeholder="e.g. Complete Blood Count"
                value={reportName} onChange={setReportName} />
              <UploadField label="Lab / Hospital Name" icon="home" placeholder="e.g. Popular Diagnostic"
                value={labName} onChange={setLabName} />
              <UploadField label="Test Date" icon="calendar" placeholder="e.g. May 20, 2026"
                value={testDate} onChange={setTestDate} />

              <Text style={s.formLabel}>Report Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 18 }}>
                {REPORT_TYPES.map(t => (
                  <TouchableOpacity key={t} style={[s.typeChip, reportType === t && s.typeChipActive]} onPress={() => setReportType(t)}>
                    <Text style={[s.typeChipText, reportType === t && s.typeChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={s.formLabel}>Overall Report Status</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
                {(['Normal', 'High', 'Low', 'Critical'] as const).map(st => (
                  <TouchableOpacity 
                    key={st} 
                    style={[
                      s.typeChip, 
                      reportStatus === st && s.typeChipActive,
                      reportStatus === st && st === 'High' && { backgroundColor: '#EF4444' },
                      reportStatus === st && st === 'Low' && { backgroundColor: '#3B82F6' },
                      reportStatus === st && st === 'Critical' && { backgroundColor: '#B91C1C' },
                      reportStatus === st && st === 'Normal' && { backgroundColor: '#10B981' }
                    ]} 
                    onPress={() => setReportStatus(st)}
                  >
                    <Text style={[s.typeChipText, reportStatus === st && { color: '#FFFFFF' }]}>{st}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Parameters List Editor */}
              <Text style={s.formSectionTitle}>Test Results / Parameters</Text>
              {ocrData.map((param, pIdx) => (
                <View key={pIdx} style={s.paramEditorCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={s.paramIndexLabel}>Parameter #{pIdx + 1}</Text>
                    <TouchableOpacity onPress={() => {
                      setOcrData(ocrData.filter((_, i) => i !== pIdx));
                    }}>
                      <Feather name="trash-2" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.paramSubLabel}>Name</Text>
                      <TextInput 
                        style={s.paramInput}
                        value={param.label}
                        onChangeText={(val) => {
                          const updated = [...ocrData];
                          updated[pIdx].label = val;
                          setOcrData(updated);
                        }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.paramSubLabel}>Value</Text>
                      <TextInput 
                        style={s.paramInput}
                        value={param.value}
                        onChangeText={(val) => {
                          const updated = [...ocrData];
                          updated[pIdx].value = val;
                          setOcrData(updated);
                        }}
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.paramSubLabel}>Ref Range</Text>
                      <TextInput 
                        style={s.paramInput}
                        value={param.refRange || ''}
                        onChangeText={(val) => {
                          const updated = [...ocrData];
                          updated[pIdx].refRange = val;
                          setOcrData(updated);
                        }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.paramSubLabel}>Status</Text>
                      <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                        {(['Normal', 'High', 'Low'] as const).map(flag => (
                          <TouchableOpacity 
                            key={flag} 
                            style={[
                              s.flagChip, 
                              param.flag === flag && s.flagChipActive,
                              param.flag === flag && flag === 'High' && { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
                              param.flag === flag && flag === 'Low' && { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
                              param.flag === flag && flag === 'Normal' && { backgroundColor: '#ECFDF5', borderColor: '#10B981' }
                            ]}
                            onPress={() => {
                              const updated = [...ocrData];
                              updated[pIdx].flag = flag;
                              setOcrData(updated);
                            }}
                          >
                            <Text style={[
                              s.flagChipText, 
                              param.flag === flag && { fontWeight: '700' },
                              param.flag === flag && flag === 'High' && { color: '#EF4444' },
                              param.flag === flag && flag === 'Low' && { color: '#3B82F6' },
                              param.flag === flag && flag === 'Normal' && { color: '#10B981' }
                            ]}>{flag}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
              ))}

              <TouchableOpacity 
                style={s.addParamBtn}
                onPress={() => {
                  setOcrData([...ocrData, { label: '', value: '', refRange: '', flag: 'Normal' }]);
                }}
              >
                <Feather name="plus" size={14} color="#4F46E5" style={{ marginRight: 6 }} />
                <Text style={s.addParamBtnText}>Add Parameter</Text>
              </TouchableOpacity>

              <UploadField label="Notes" icon="edit-3" placeholder="Additional notes..."
                value={notes} onChange={setNotes} multiline />

              <TouchableOpacity
                style={[s.saveBtn, !reportName.trim() && { opacity: 0.5 }]}
                onPress={saveReport} disabled={!reportName.trim()} activeOpacity={0.85}
              >
                <Feather name="save" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={s.saveBtnText}>Save Report</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.rescanBtn} onPress={resetScan}>
                <MaterialCommunityIcons name="camera-retake-outline" size={16} color="#6366F1" style={{ marginRight: 6 }} />
                <Text style={s.rescanBtnText}>Re-scan</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Sub Components ────────────────────────────────────────────────
function StatChip({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <View style={[s.statChip, { backgroundColor: bg }]}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={[s.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

function ActionBtn({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.actionBtn, { borderColor: color + '33', backgroundColor: color + '11' }]} onPress={onPress} activeOpacity={0.8}>
      <Feather name={icon as any} size={18} color={color} style={{ marginBottom: 4 }} />
      <Text style={[s.actionBtnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function UploadField({ label, icon, placeholder, value, onChange, multiline }: {
  label: string; icon: string; placeholder: string; value: string;
  onChange: (v: string) => void; multiline?: boolean;
}) {
  return (
    <>
      <Text style={s.formLabel}>{label}</Text>
      <View style={[s.inputRow, multiline && { height: 80, alignItems: 'flex-start', paddingTop: 12, marginBottom: 16 }]}>
        <Feather name={icon as any} size={16} color="#A0AEC0" style={{ marginRight: 10, marginTop: multiline ? 2 : 0 }} />
        <TextInput
          style={[s.input, multiline && { textAlignVertical: 'top' }]}
          placeholder={placeholder} placeholderTextColor="#A0AEC0"
          value={value} onChangeText={onChange} multiline={multiline}
        />
      </View>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FF' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F8',
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F7F7FF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1A202C' },
  headerSub: { fontSize: 11, color: '#718096', marginTop: 1 },
  statusPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 12, fontWeight: '700' },

  // Action bar (detail view)
  actionBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F8' },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  actionBtnText: { fontSize: 12, fontWeight: '700' },

  // Detail tabs
  detailTabRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingBottom: 12 },
  detailTab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10, backgroundColor: '#F1F1FB', marginRight: 8 },
  detailTabActive: { backgroundColor: '#4F46E5' },
  detailTabText: { fontSize: 13, fontWeight: '600', color: '#718096' },
  detailTabTextActive: { color: '#FFFFFF' },
  detailScroll: { paddingHorizontal: 16, paddingTop: 14 },

  // OCR data
  ocrDataCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  ocrDataHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  ocrDataHeaderText: { fontSize: 14, fontWeight: '700', color: '#1A202C', marginLeft: 8 },
  ocrDataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F8' },
  ocrDataLabel: { fontSize: 13, color: '#4A5568', fontWeight: '600' },
  ocrDataValue: { fontSize: 13, color: '#1A202C', fontWeight: '700' },
  flagBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  flagText: { fontSize: 11, fontWeight: '700' },

  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F8' },
  infoLabel: { fontSize: 13, color: '#718096', fontWeight: '600' },
  infoValue: { fontSize: 13, color: '#1A202C', fontWeight: '700', maxWidth: '60%', textAlign: 'right' },

  // OCR Text
  ocrTextCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginBottom: 14 },
  ocrTextHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  ocrTextHeaderText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1A202C' },
  copyBtn: { padding: 6, backgroundColor: '#EEF2FF', borderRadius: 8 },
  ocrRawText: { fontFamily: 'monospace' as any, fontSize: 12, color: '#2D3748', lineHeight: 20, backgroundColor: '#F8F9FF', borderRadius: 10, padding: 12 },

  // Image preview
  imagePreviewCard: { borderRadius: 18, marginBottom: 14, overflow: 'hidden', minHeight: 240, alignItems: 'center', justifyContent: 'center', padding: 24 },
  mockImageInner: { alignItems: 'center', width: '100%' },
  mockImageTitle: { fontSize: 16, fontWeight: '800', color: '#1A202C', textAlign: 'center' },
  mockImageSub: { fontSize: 13, color: '#4A5568', marginTop: 4, textAlign: 'center' },
  mockImageDate: { fontSize: 12, color: '#718096', marginTop: 2 },
  mockImageLines: { width: '100%', marginTop: 16, gap: 8 },
  mockLine: { height: 8, backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 4, alignSelf: 'flex-start' },
  imageActionsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  imgActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 12, gap: 6, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  imgActionText: { fontSize: 12, fontWeight: '700' },
  noImageWrap: { alignItems: 'center', paddingVertical: 60 },
  noImageText: { fontSize: 14, color: '#A0AEC0', marginTop: 12 },

  // Tabs
  tabWrap: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F8' },
  tabBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: '#F1F1FB' },
  tabBtnActive: { backgroundColor: '#4F46E5' },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: '#718096' },
  tabBtnTextActive: { color: '#FFFFFF' },

  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statChip: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  filterRow: { paddingBottom: 14, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0' },
  filterChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#718096' },
  filterTextActive: { color: '#FFFFFF' },

  scanBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4F46E5', borderRadius: 18, padding: 16, marginBottom: 16, gap: 14, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  scanBannerIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  scanBannerTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  scanBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  reportCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, marginBottom: 12, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  reportImgThumb: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  reportInfo: { flex: 1 },
  reportName: { fontSize: 14, fontWeight: '700', color: '#1A202C' },
  reportMeta: { fontSize: 11, color: '#718096', marginTop: 2 },
  typeBadge: { alignSelf: 'flex-start', backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 5 },
  typeBadgeText: { fontSize: 11, color: '#4A5568', fontWeight: '600' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  viewBtnText: { fontSize: 12, fontWeight: '700', color: '#4F46E5', marginRight: 2 },

  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#718096', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#A0AEC0', marginTop: 4 },

  // Scan UI
  scanBox: { borderWidth: 2, borderColor: '#C7D2FE', borderStyle: 'dashed', borderRadius: 24, overflow: 'hidden', marginBottom: 20 },
  scanFrame: { padding: 40, alignItems: 'center', backgroundColor: '#F8F9FF', position: 'relative' },
  corner: { position: 'absolute', width: 20, height: 20, borderColor: '#4F46E5', borderWidth: 3 },
  cornerTL: { top: 12, left: 12, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 12, right: 12, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 12, left: 12, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 12, right: 12, borderLeftWidth: 0, borderTopWidth: 0 },
  scanBoxTitle: { fontSize: 17, fontWeight: '800', color: '#1A202C', marginBottom: 6 },
  scanBoxSub: { fontSize: 13, color: '#718096' },

  orRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  orLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  orText: { paddingHorizontal: 14, fontSize: 13, fontWeight: '700', color: '#A0AEC0' },
  galleryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.5, borderColor: '#6366F1', paddingVertical: 14, marginBottom: 8 },
  galleryBtnText: { fontSize: 15, fontWeight: '700', color: '#4F46E5' },
  supportedText: { textAlign: 'center', fontSize: 12, color: '#A0AEC0', marginBottom: 20 },

  tipsCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, marginBottom: 20 },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: '#1A202C', marginBottom: 12 },
  tipRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4F46E5', marginRight: 10 },
  tipText: { fontSize: 13, color: '#4A5568' },

  // Scanning animation
  scanningWrap: { alignItems: 'center', paddingTop: 20 },
  scanStepTitle: { fontSize: 18, fontWeight: '800', color: '#1A202C', marginBottom: 16 },
  scanningBox: { width: '100%', height: 220, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden' },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: '#4F46E5', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 4, top: 0 },
  scanStepSub: { fontSize: 13, color: '#718096' },

  // OCR Processing
  processingWrap: { alignItems: 'center', paddingTop: 20 },
  aiIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  processingTitle: { fontSize: 18, fontWeight: '800', color: '#1A202C', marginBottom: 6 },
  processingSub: { fontSize: 13, color: '#718096', marginBottom: 20 },
  progressTrack: { width: '100%', height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, marginBottom: 24, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#4F46E5', borderRadius: 4 },
  aiStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, alignSelf: 'flex-start' },
  aiStepText: { fontSize: 13, color: '#4A5568' },

  // Form (after OCR)
  ocrPreviewCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginBottom: 16, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  ocrPreviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  mockThumb: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ocrPreviewLabel: { fontSize: 14, fontWeight: '800', color: '#1A202C' },
  ocrPreviewSub: { fontSize: 12, color: '#059669', marginTop: 2 },
  ocrPreviewText: { fontSize: 12, color: '#4A5568', fontFamily: 'monospace' as any, backgroundColor: '#F8F9FF', borderRadius: 10, padding: 10, lineHeight: 18 },
  ocrReadMore: { fontSize: 13, color: '#4F46E5', fontWeight: '600', marginTop: 8 },

  formSectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A202C', marginBottom: 14 },
  formLabel: { fontSize: 11, fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5, borderColor: '#E8E5FF', paddingHorizontal: 12, height: 50, marginBottom: 16 },
  input: { flex: 1, fontSize: 14, color: '#1A202C' },

  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8F9FF' },
  typeChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  typeChipText: { fontSize: 13, fontWeight: '600', color: '#718096' },
  typeChipTextActive: { color: '#FFFFFF' },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4F46E5', borderRadius: 16, height: 54, marginTop: 8, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  rescanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14, paddingVertical: 12 },
  rescanBtnText: { fontSize: 14, color: '#6366F1', fontWeight: '600' },

  // Parameters list editor styling
  paramEditorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  paramIndexLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
    textTransform: 'uppercase',
  },
  paramSubLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A0AEC0',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  paramInput: {
    fontSize: 13,
    color: '#1A202C',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  flagChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  flagChipActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2F6',
  },
  flagChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#718096',
  },
  addParamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#4F46E5',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 20,
  },
  addParamBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
});
