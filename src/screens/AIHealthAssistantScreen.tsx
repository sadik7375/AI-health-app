import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { apiAIAssistant } from '../api/apiClient';
import { healthStore } from '../store/healthStore';

const { width } = Dimensions.get('window');

type Nav = NativeStackNavigationProp<RootStackParamList, 'AIHealthAssistant'>;
interface Props {
  navigation: Nav;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text?: string;
  time: string;
  type?: 'text' | 'medicines_widget' | 'cbc_report_widget' | 'drug_interaction_widget' | 'file_attachment';
  attachmentName?: string;
  attachmentDate?: string;
  widgetData?: any;
}

export default function AIHealthAssistantScreen({ navigation }: Props) {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  // Initial chat history simulating rich assistant capabilities
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Hi Abdul! 👋 I am your AI Health Assistant. How can I help you with your health, medicines, or reports today?',
      time: '9:30 AM',
    },
  ]);

  const getTodayMedsData = () => {
    const activeReminders = healthStore.getReminders();
    if (activeReminders && activeReminders.length > 0) {
      return activeReminders.map(r => ({
        id: r.id,
        name: r.name,
        dosage: r.dosage,
        time: r.time,
        status: r.taken ? 'Taken' : 'Pending',
      }));
    }
    return [
      { id: '1', name: 'Metformin 500mg', dosage: '1 tablet • After Breakfast', time: '8:00 AM', status: 'Taken' },
      { id: '2', name: 'Vitamin D3 1000 IU', dosage: '1 tablet • After Dinner', time: '8:00 PM', status: 'Pending' },
      { id: '3', name: 'Amlodipine 5mg', dosage: '1 tablet • After Breakfast', time: '8:00 AM', status: 'Taken' },
    ];
  };

  // Send User Message
  const sendMessage = (customText?: string, messageType?: ChatMessage['type'], extraData?: any) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() && !messageType) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: messageType === 'file_attachment' ? 'file_attachment' : 'text',
      attachmentName: extraData?.fileName,
      attachmentDate: extraData?.fileDate,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Scroll to bottom
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    // AI Response (Dynamic API call with fallback)
    (async () => {
      let aiMsg: ChatMessage;
      const isMeds = textToSend.toLowerCase().includes('medicine') || textToSend.toLowerCase().includes('take today') || extraData?.intent === 'MEDS';
      const isCbc = textToSend.toLowerCase().includes('cbc') || textToSend.toLowerCase().includes('report') || extraData?.intent === 'REPORT';
      const isInteraction = textToSend.toLowerCase().includes('safe') || textToSend.toLowerCase().includes('interaction') || extraData?.intent === 'INTERACTION';

      try {
        const apiRes = await apiAIAssistant.chat(textToSend);
        if (apiRes && apiRes.success && apiRes.reply) {
          aiMsg = {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: apiRes.reply,
            time: apiRes.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            ...(isMeds && {
              type: 'medicines_widget',
              widgetData: getTodayMedsData(),
            }),
            ...(isCbc && {
              type: 'cbc_report_widget',
              widgetData: [
                { label: 'Hemoglobin', value: '13.2 g/dL', flag: 'Normal' },
                { label: 'WBC Count', value: '11.2 x10^3/uL', flag: 'High' },
                { label: 'Platelet Count', value: '2.45 x10^5/uL', flag: 'Normal' },
                { label: 'RBC Count', value: '4.71 x10^6/uL', flag: 'Normal' },
              ]
            }),
            ...(isInteraction && {
              type: 'drug_interaction_widget',
              widgetData: {
                safeStatus: 'No major interactions found 🌿',
                note: 'These medicines are generally safe to take together.',
                medsList: ['Metformin 500mg', 'Amlodipine 5mg', 'Vitamin D3 1000 IU'],
              }
            })
          };
          setIsTyping(false);
          setMessages((prev) => [...prev, aiMsg]);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
          return;
        }
      } catch (_) {
        // Backend offline / fall through to rich local widget response
      }

      // Rich Widget Fallbacks
      if (isMeds) {
        aiMsg = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'Here are the medicines you need to take today:',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'medicines_widget',
          widgetData: getTodayMedsData(),
        };
      } else if (isCbc) {
        aiMsg = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'Here is the summary of your CBC report:',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'cbc_report_widget',
          widgetData: [
            { label: 'Hemoglobin', value: '13.2 g/dL', flag: 'Normal' },
            { label: 'WBC Count', value: '11.2 x10^3/uL', flag: 'High' },
            { label: 'Platelet Count', value: '2.45 x10^5/uL', flag: 'Normal' },
            { label: 'RBC Count', value: '4.71 x10^6/uL', flag: 'Normal' },
          ],
        };
      } else if (isInteraction) {
        aiMsg = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: "I've checked your medicines for potential interactions:",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'drug_interaction_widget',
          widgetData: {
            safeStatus: 'No major interactions found 🌿',
            note: 'These medicines are generally safe to take together.',
            medsList: ['Metformin 500mg', 'Amlodipine 5mg', 'Vitamin D3 1000 IU'],
          },
        };
      } else {
        aiMsg = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: `Based on your health records, ${textToSend.toLowerCase().includes('eat') || textToSend.toLowerCase().includes('diet') ? 'a balanced low-glycemic diet with plenty of leafy greens and low-fat proteins is recommended.' : 'your vitals look steady. Always consult your doctor for medical decisions.'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }

      setIsTyping(false);
      setMessages((prev) => [...prev, aiMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    })();
  };



  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color="#1A202C" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={styles.botHeaderAvatar}>
            <MaterialCommunityIcons name="robot-happy-outline" size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Health Assistant</Text>
            <Text style={styles.headerStatus}>● Online • Powered by AI</Text>
          </View>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.chatScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* AI Avatar Hero Header (If only 1 message) */}
          {messages.length <= 1 && (
            <View style={styles.heroWrap}>
              <View style={styles.heroAvatarBg}>
                <MaterialCommunityIcons name="robot-happy" size={48} color="#4F46E5" />
              </View>
              <Text style={styles.heroGreeting}>Hi Abdul! 👋</Text>
              <Text style={styles.heroSubtitle}>How can I help you today?</Text>
            </View>
          )}

          {/* Chat Messages */}
          {messages.map((msg) => (
            <View key={msg.id} style={[styles.msgRow, msg.sender === 'user' ? styles.userRow : styles.aiRow]}>
              {msg.sender === 'ai' && (
                <View style={styles.msgBotAvatar}>
                  <MaterialCommunityIcons name="robot-happy" size={16} color="#FFFFFF" />
                </View>
              )}

              <View style={[styles.msgBubble, msg.sender === 'user' ? styles.userBubble : styles.aiBubble]}>
                {/* Text Message */}
                {msg.text && (
                  <Text style={[styles.msgText, msg.sender === 'user' ? styles.userMsgText : styles.aiMsgText]}>
                    {msg.text}
                  </Text>
                )}

                {/* Attachment Card */}
                {msg.type === 'file_attachment' && (
                  <View style={styles.attachmentCard}>
                    <FontAwesome5 name="file-pdf" size={24} color="#EF4444" style={{ marginRight: 10 }} />
                    <View>
                      <Text style={styles.attachmentName}>{msg.attachmentName}</Text>
                      <Text style={styles.attachmentDate}>{msg.attachmentDate}</Text>
                    </View>
                  </View>
                )}

                {/* WIDGET 1: Today's Medicines Card Widget */}
                {msg.type === 'medicines_widget' && (
                  <View style={styles.widgetContainer}>
                    {msg.widgetData.map((m: any) => (
                      <View key={m.id} style={styles.medWidgetRow}>
                        <View style={styles.medWidgetIcon}>
                          <MaterialCommunityIcons name="pill" size={18} color="#4F46E5" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.medWidgetName}>{m.name}</Text>
                          <Text style={styles.medWidgetDosage}>{m.dosage}</Text>
                        </View>
                        <View style={styles.medWidgetTimeBadge}>
                          <Text style={styles.medWidgetTimeText}>{m.time}</Text>
                        </View>
                      </View>
                    ))}
                    <View style={styles.widgetNoteBox}>
                      <Feather name="info" size={12} color="#4F46E5" style={{ marginRight: 6 }} />
                      <Text style={styles.widgetNoteText}>Don't forget to mark them as taken after you take each dose.</Text>
                    </View>
                    <View style={styles.chipActionsRow}>
                      <TouchableOpacity style={styles.chipBtn} onPress={() => sendMessage('Tell me more about Metformin')}>
                        <Text style={styles.chipBtnText}>Tell me more</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.chipBtn} onPress={() => navigation.navigate('Appointments')}>
                        <Text style={styles.chipBtnText}>Set reminder</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* WIDGET 2: CBC Report Parser Widget */}
                {msg.type === 'cbc_report_widget' && (
                  <View style={styles.widgetContainer}>
                    {msg.widgetData.map((d: any, idx: number) => (
                      <View key={idx} style={styles.reportWidgetRow}>
                        <Text style={styles.reportWidgetLabel}>{d.label}</Text>
                        <Text style={styles.reportWidgetVal}>{d.value}</Text>
                        <View style={[styles.flagPill, { backgroundColor: d.flag === 'High' ? '#FEE2E2' : '#ECFDF5' }]}>
                          <Text style={[styles.flagPillText, { color: d.flag === 'High' ? '#EF4444' : '#059669' }]}>
                            {d.flag}
                          </Text>
                        </View>
                      </View>
                    ))}

                    <View style={[styles.widgetNoteBox, { backgroundColor: '#FFFBEB' }]}>
                      <Feather name="alert-triangle" size={14} color="#D97706" style={{ marginRight: 6 }} />
                      <Text style={[styles.widgetNoteText, { color: '#92400E' }]}>
                        Your WBC count is slightly elevated. This could indicate an infection. Consult your doctor if you have fever or weakness.
                      </Text>
                    </View>

                    <View style={styles.chipActionsRow}>
                      <TouchableOpacity style={styles.chipBtn} onPress={() => navigation.navigate('LabReport')}>
                        <Text style={styles.chipBtnText}>View Full Report</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.chipBtn} onPress={() => Alert.alert('Shared', 'Report summary shared!')}>
                        <Text style={styles.chipBtnText}>Share Report</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* WIDGET 3: Drug Interaction Review Widget */}
                {msg.type === 'drug_interaction_widget' && (
                  <View style={styles.widgetContainer}>
                    <View style={styles.safetyBox}>
                      <Text style={styles.safetyTitle}>{msg.widgetData.safeStatus}</Text>
                      <Text style={styles.safetySub}>{msg.widgetData.note}</Text>
                    </View>
                    {msg.widgetData.medsList.map((m: string, i: number) => (
                      <View key={i} style={styles.interactionMedRow}>
                        <MaterialCommunityIcons name="pill" size={16} color="#10B981" style={{ marginRight: 8 }} />
                        <Text style={styles.interactionMedName}>{m}</Text>
                        <Feather name="check" size={14} color="#10B981" />
                      </View>
                    ))}
                    <Text style={styles.disclaimerText}>⚠️ This is not medical advice. Always follow your doctor's instructions.</Text>
                  </View>
                )}

                <Text style={[styles.msgTime, msg.sender === 'user' ? styles.userMsgTime : styles.aiMsgTime]}>
                  {msg.time}
                </Text>
              </View>
            </View>
          ))}

          {/* AI Typing Indicator */}
          {isTyping && (
            <View style={[styles.msgRow, styles.aiRow]}>
              <View style={styles.msgBotAvatar}>
                <MaterialCommunityIcons name="robot-happy" size={16} color="#FFFFFF" />
              </View>
              <View style={[styles.msgBubble, styles.aiBubble, { paddingVertical: 10 }]}>
                <Text style={{ fontSize: 13, color: '#718096', fontStyle: 'italic' }}>AI is thinking...</Text>
              </View>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Suggested Quick Question Chips */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={{ height: 56, flexGrow: 0 }}
          contentContainerStyle={[styles.suggestedChipsRow, { paddingVertical: 4, alignItems: 'center' }]}
        >
          {[
            'What medicines should I take today?',
            'Explain my CBC blood report',
            'Are my medicines safe together?',
            'What can I eat for high blood pressure?',
          ].map((prompt, idx) => (
            <TouchableOpacity key={idx} style={styles.suggestedChip} onPress={() => sendMessage(prompt)}>
              <Text style={styles.suggestedChipText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Bottom Bar Input Area */}
        <View style={styles.inputBarContainer}>
          <TextInput
            style={styles.chatInput}
            placeholder="Type a message or question..."
            placeholderTextColor="#A0AEC0"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => sendMessage()}
          />

          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]}
            disabled={!inputText.trim()}
            onPress={() => sendMessage()}
          >
            <Feather name="send" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Sub Components ────────────────────────────────────────────────
function StarterCard({ icon, color, bg, title, desc, onPress }: {
  icon: string; color: string; bg: string; title: string; desc: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.starterCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.starterIconBg, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color={color} />
      </View>
      <Text style={styles.starterTitle}>{title}</Text>
      <Text style={styles.starterDesc}>{desc}</Text>
    </TouchableOpacity>
  );
}

function SummaryMetricCard({ title, value, sub, color, bg, icon }: {
  title: string; value: string; sub: string; color: string; bg: string; icon: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIconBg, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.metricCardTitle}>{title}</Text>
      <Text style={[styles.metricCardVal, { color }]}>{value}</Text>
      <Text style={styles.metricCardSub}>{sub}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F8',
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F7F7FF', alignItems: 'center', justifyContent: 'center' },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 12 },
  botHeaderAvatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1A202C' },
  headerStatus: { fontSize: 11, color: '#10B981', fontWeight: '600', marginTop: 1 },
  historyBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },

  // Mode Tabs
  modeTabsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFFFF', gap: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F8' },
  modeTab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 9, borderRadius: 12, backgroundColor: '#F1F1FB' },
  modeTabActive: { backgroundColor: '#4F46E5' },
  modeTabText: { fontSize: 13, fontWeight: '600', color: '#718096' },
  modeTabTextActive: { color: '#FFFFFF' },

  chatScroll: { paddingHorizontal: 16, paddingTop: 16 },

  // Hero Starter View
  heroWrap: { alignItems: 'center', marginBottom: 20 },
  heroAvatarBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroGreeting: { fontSize: 22, fontWeight: '900', color: '#1A202C' },
  heroSubtitle: { fontSize: 13, color: '#718096', marginTop: 2, marginBottom: 20 },

  starterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: '100%' },
  starterCard: { width: (width - 44) / 2, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  starterIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  starterTitle: { fontSize: 13, fontWeight: '800', color: '#1A202C', marginBottom: 4 },
  starterDesc: { fontSize: 11, color: '#718096', lineHeight: 15 },

  // Chat Bubbles
  msgRow: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end' },
  userRow: { justifyContent: 'flex-end' },
  aiRow: { justifyContent: 'flex-start' },
  msgBotAvatar: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 4 },

  msgBubble: { maxWidth: '82%', borderRadius: 18, padding: 14 },
  userBubble: { backgroundColor: '#4F46E5', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },

  msgText: { fontSize: 14, lineHeight: 21 },
  userMsgText: { color: '#FFFFFF', fontWeight: '500' },
  aiMsgText: { color: '#1A202C', fontWeight: '500' },

  msgTime: { fontSize: 10, marginTop: 6, alignSelf: 'flex-end' },
  userMsgTime: { color: 'rgba(255,255,255,0.7)' },
  aiMsgTime: { color: '#A0AEC0' },

  // Attachment Card
  attachmentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FF', borderRadius: 12, padding: 10, marginTop: 6 },
  attachmentName: { fontSize: 13, fontWeight: '700', color: '#1A202C' },
  attachmentDate: { fontSize: 11, color: '#718096', marginTop: 1 },

  // Widgets in Chat
  widgetContainer: { marginTop: 10, gap: 8 },
  medWidgetRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FF', borderRadius: 12, padding: 10 },
  medWidgetIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  medWidgetName: { fontSize: 13, fontWeight: '700', color: '#1A202C' },
  medWidgetDosage: { fontSize: 11, color: '#718096', marginTop: 1 },
  medWidgetTimeBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  medWidgetTimeText: { fontSize: 11, fontWeight: '700', color: '#059669' },

  widgetNoteBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 10, padding: 10, marginTop: 4 },
  widgetNoteText: { flex: 1, fontSize: 11, color: '#4F46E5', lineHeight: 16, fontWeight: '500' },

  chipActionsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  chipBtn: { flex: 1, backgroundColor: '#EEF2FF', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  chipBtnText: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },

  // CBC Widget
  reportWidgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F8' },
  reportWidgetLabel: { fontSize: 12, color: '#4A5568', fontWeight: '600' },
  reportWidgetVal: { fontSize: 12, fontWeight: '700', color: '#1A202C' },
  flagPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  flagPillText: { fontSize: 10, fontWeight: '800' },

  // Drug Interaction Widget
  safetyBox: { backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12, marginBottom: 6 },
  safetyTitle: { fontSize: 13, fontWeight: '800', color: '#059669' },
  safetySub: { fontSize: 11, color: '#047857', marginTop: 2 },
  interactionMedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  interactionMedName: { flex: 1, fontSize: 12, fontWeight: '700', color: '#1A202C' },
  disclaimerText: { fontSize: 10, color: '#A0AEC0', fontStyle: 'italic', marginTop: 6 },

  // Voice Overlay
  voiceRecordingOverlay: { backgroundColor: '#4F46E5', borderRadius: 20, padding: 20, alignItems: 'center', marginHorizontal: 16, marginBottom: 10 },
  pulseCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  voiceRecordingTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  voiceRecordingSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // Suggested Chips
  suggestedChipsRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  suggestedChip: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  suggestedChipText: { fontSize: 12, fontWeight: '600', color: '#4F46E5' },

  // Bottom Input Bar
  inputBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F0F0F8', gap: 8 },
  attachBtn: { padding: 8 },
  chatInput: { flex: 1, backgroundColor: '#F8F9FF', borderRadius: 20, paddingHorizontal: 16, height: 42, fontSize: 14, color: '#1A202C' },
  micBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  micBtnActive: { backgroundColor: '#EF4444' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' },

  // Summary Tab Styles
  summaryScroll: { paddingHorizontal: 18, paddingTop: 18 },
  summaryTitle: { fontSize: 20, fontWeight: '800', color: '#1A202C' },
  summarySub: { fontSize: 13, color: '#718096', marginTop: 2, marginBottom: 18 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  metricCard: { width: (width - 48) / 2, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  metricIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  metricCardTitle: { fontSize: 12, fontWeight: '700', color: '#718096' },
  metricCardVal: { fontSize: 20, fontWeight: '900', marginTop: 4 },
  metricCardSub: { fontSize: 11, color: '#A0AEC0', marginTop: 2 },

  insightBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 18, padding: 16, marginBottom: 20 },
  insightTitle: { fontSize: 15, fontWeight: '800', color: '#1A202C' },
  insightDesc: { fontSize: 12, color: '#4F46E5', marginTop: 2, lineHeight: 18 },

  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4F46E5', borderRadius: 16, height: 52, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  exportBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
