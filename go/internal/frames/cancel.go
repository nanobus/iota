package frames

// https://rsocket.io/about/protocol/#cancel-frame-0x09

type Cancel struct {
	StreamID uint32
}

func (f *Cancel) GetStreamID() uint32 {
	return f.StreamID
}

func (f *Cancel) Type() FrameType {
	return FrameTypeCancel
}

func (f *Cancel) Decode(header *FrameHeader, payload []byte) error {
	*f = Cancel{
		StreamID: header.StreamID(),
	}

	return nil
}

func (f *Cancel) Encode(buf []byte) {
	ResetFrameHeader(buf, f.StreamID, FrameTypeCancel, 0)
}

func (f *Cancel) Size() uint32 {
	return FrameHeaderLen
}
