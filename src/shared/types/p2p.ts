export interface PeerInfo {
  peerId: string;
  name: string;
  isConnected: boolean;
  lastSeen?: Date;
}

export interface FileTransferInfo {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number;
  status: 'pending' | 'transferring' | 'completed' | 'error' | 'cancelled';
  direction: 'send' | 'receive';
  peerId: string;
  startTime?: Date;
  endTime?: Date;
  speed?: number;
  transferredBytes: number;
  filePath?: string;
}

export interface ConnectionInfo {
  peerId: string;
  connectionCode: string;
  sdpOffer?: RTCSessionDescriptionInit;
  iceCandidates: RTCIceCandidateInit[];
  connectionType: 'initiator' | 'receiver';
  timestamp: number;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'connection-request' | 'file-transfer';
  data: any;
  fromPeerId: string;
  toPeerId: string;
  timestamp: number;
}

export interface FileChunk {
  fileId: string;
  chunkIndex: number;
  totalChunks: number;
  data: ArrayBuffer;
  checksum: string;
}

export interface P2PConfig {
  maxFileSize: number;
  chunkSize: number;
  maxConcurrentTransfers: number;
  connectionTimeout: number;
  reconnectAttempts: number;
}