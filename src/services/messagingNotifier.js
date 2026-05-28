class MessagingNotifier {
  static emit(storeId, event, data) {
    if (!global.wsService) return;
    global.wsService.notifyChannel(storeId, 'messaging', event, data);
  }

  static accountStatusChanged(storeId, account) {
    this.emit(storeId, 'messaging_account_status_changed', { account });
  }

  static qrGenerated(storeId, account) {
    this.emit(storeId, 'messaging_qr_generated', { account });
  }

  static conversationUpdated(storeId, conversation) {
    this.emit(storeId, 'messaging_conversation_updated', { conversation });
  }

  static messageReceived(storeId, message, conversation) {
    this.emit(storeId, 'messaging_message_received', {
      message: message?.toJSON ? message.toJSON() : message,
      conversation: conversation?.toJSON ? conversation.toJSON() : conversation,
    });
  }

  static messageSent(storeId, message, conversation) {
    this.emit(storeId, 'messaging_message_sent', {
      message: message?.toJSON ? message.toJSON() : message,
      conversation: conversation?.toJSON ? conversation.toJSON() : conversation,
    });
  }

  static messageStatusChanged(storeId, message) {
    this.emit(storeId, 'messaging_message_status_changed', { message });
  }

  static messageReactionChanged(storeId, message) {
    this.emit(storeId, 'messaging_message_reaction_changed', {
      message: message?.toJSON ? message.toJSON() : message,
    });
  }
}

export default MessagingNotifier;
