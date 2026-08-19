const LoadingBubbles = () => {
  return (
    <div className="assistant bubble" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '16px 20px',
      minHeight: '60px'
    }}>
      <div className="loader"></div>
      <span style={{
        color: '#1e40af',
        fontSize: '14px',
        fontStyle: 'italic',
        fontWeight: 500
      }}>
        AI is thinking...
      </span>
    </div>
  )
}

export default LoadingBubbles;
