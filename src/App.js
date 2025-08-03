import React, { useState, useEffect } from 'react';
  import Modal from 'react-modal';
  import { ToastContainer, toast } from 'react-toastify';
  import 'react-toastify/dist/ReactToastify.css';
  import './App.css';

  Modal.setAppElement('#root');

  const contractABI = [
      {
          "inputs": [
              {"name": "betType", "type": "string"}
          ],
          "name": "placeBet",
          "stateMutability": "payable",
          "type": "function"
      },
      {
          "inputs": [],
          "name": "dealCards",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
      },
      {
          "inputs": [],
          "name": "calculateResult",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
      },
      {
          "anonymous": true,
          "inputs": [
              {"indexed": true, "name": "player", "type": "address"},
              {"name": "betType", "type": "string"},
              {"name": "amount", "type": "uint256"}
          ],
          "name": "BetPlaced",
          "type": "event"
      },
      {
          "anonymous": true,
          "inputs": [
              {"name": "winner", "type": "string"},
              {"name": "playerScore", "type": "uint256"},
              {"name": "bankerScore", "type": "uint256"}
          ],
          "name": "GameResult",
          "type": "event"
      }
  ];
  const contractAddress = "YOUR_CONTRACT_ADDRESS"; // Cập nhật sau khi triển khai

  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  function Card({ card, flipped }) {
      return (
          <div className={`card ${flipped ? 'flipped' : ''}`}>
              <div className="card-inner">
                  <div className="card-back">🂠</div>
                  <div className="card-front flex flex-col justify-between p-2 text-black">
                      <div className="text-lg">{card.rank}</div>
                      <div className="text-3xl text-center">{card.suit}</div>
                      <div className="text-lg transform rotate-180">{card.rank}</div>
                  </div>
              </div>
          </div>
      );
  }

  function BetArea({ type, amount, selected, onClick }) {
      return (
          <div
              className={`p-4 rounded-lg bg-gradient-to-br ${selected ? 'from-yellow-400 to-orange-500' : 'from-blue-600 to-blue-800'} border-2 border-yellow-400 text-center cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all ${selected ? 'winner-pulse' : ''}`}
              onClick={() => onClick(type)}
          >
              <h3 className="text-lg font-bold">{type.toUpperCase()}</h3>
              <div className="text-xl font-semibold">{amount} ETH</div>
              <div className="text-sm mt-1">{type === 'tie' ? 'Tỷ lệ: 8:1' : 'Tỷ lệ: 1:1'}</div>
          </div>
      );
  }

  function App() {
      const [gameState, setGameState] = useState('betting');
      const [bets, setBets] = useState({ player: 0, banker: 0, tie: 0 });
      const [selectedBet, setSelectedBet] = useState(null);
      const [betAmount, setBetAmount] = useState('');
      const [playerCards, setPlayerCards] = useState([]);
      const [bankerCards, setBankerCards] = useState([]);
      const [playerScore, setPlayerScore] = useState(0);
      const [bankerScore, setBankerScore] = useState(0);
      const [result, setResult] = useState('Chờ đặt cược...');
      const [web3, setWeb3] = useState(null);
      const [contract, setContract] = useState(null);
      const [account, setAccount] = useState(null);
      const [isModalOpen, setIsModalOpen] = useState(true);

      useEffect(() => {
          async function initWeb3() {
              if (window.ethereum) {
                  const web3Instance = new Web3(window.ethereum);
                  setWeb3(web3Instance);
                  try {
                      await window.ethereum.request({ method: 'eth_requestAccounts' });
                      const networkId = await web3Instance.eth.net.getId();
                      if (networkId !== 421614) {
                          await window.ethereum.request({
                              method: 'wallet_switchEthereumChain',
                              params: [{ chainId: '0x66eee' }],
                          });
                      }
                      const accounts = await web3Instance.eth.getAccounts();
                      setAccount(accounts[0]);
                      const contractInstance = new web3Instance.eth.Contract(contractABI, contractAddress);
                      setContract(contractInstance);

                      contractInstance.events.BetPlaced()
                          .on('data', (event) => {
                              const { betType, amount } = event.returnValues;
                              setBets(prev => ({ ...prev, [betType]: prev[betType] + Number(web3Instance.utils.fromWei(amount, 'ether')) }));
                              toast.success(`Đã đặt cược ${web3Instance.utils.fromWei(amount, 'ether')} ETH vào ${betType.toUpperCase()}!`);
                          });
                      contractInstance.events.GameResult()
                          .on('data', (event) => {
                              const { winner, playerScore, bankerScore } = event.returnValues;
                              setResult(`${winner.toUpperCase()} THẮNG!`);
                              setPlayerScore(Number(playerScore));
                              setBankerScore(Number(bankerScore));
                              toast.success(`${winner.toUpperCase()} thắng với điểm: Player ${playerScore}, Banker ${bankerScore}`);
                          });
                  } catch (error) {
                      toast.error('Lỗi kết nối ví MetaMask! Kiểm tra mạng Arbitrum Sepolia.');
                  }
              } else {
                  toast.error('Vui lòng cài đặt MetaMask!');
              }
          }
          initWeb3();
      }, []);

      const placeBet = async () => {
          if (!selectedBet || !betAmount || gameState !== 'betting') return;
          try {
              await contract.methods.placeBet(selectedBet).send({
                  from: account,
                  value: web3.utils.toWei(betAmount, 'ether'),
              });
              setBetAmount('');
          } catch (error) {
              toast.error('Lỗi khi đặt cược! Kiểm tra số dư ETH.');
          }
      };

      const startGame = async () => {
          try {
              setGameState('dealing');
              await contract.methods.dealCards().send({ from: account });
          } catch (error) {
              toast.error('Lỗi khi bắt đầu game! Kiểm tra LINK trong contract.');
              setGameState('betting');
          }
      };

      return (
          <div className="max-w-5xl mx-auto p-4">
              <Modal
                  isOpen={isModalOpen}
                  onRequestClose={() => setIsModalOpen(false)}
                  className="bg-gray-800 p-6 rounded-lg max-w-md mx-auto mt-20 text-white"
                  overlayClassName="modal-overlay"
              >
                  <h2 className="text-2xl font-bold mb-4">Hướng dẫn chơi Baccarat</h2>
                  <p>1. Chọn Player, Banker hoặc Tie.</p>
                  <p>2. Nhập số ETH muốn cược (tối thiểu 0.01 ETH).</p>
                  <p>3. Nhấn "BẮT ĐẦU" để chia bài.</p>
                  <p>4. Lấy ETH/LINK testnet từ:</p>
                  <p><a href="https://sepoliafaucet.com" target="_blank" className="text-blue-400">Sepolia Faucet</a></p>
                  <p><a href="https://faucets.chain.link/sepolia" target="_blank" className="text-blue-400">Chainlink Faucet</a></p>
                  <p>5. Arbitrum Sepolia RPC: <span className="text-blue-400" onClick={() => navigator.clipboard.write('https://sepolia-rollup.arbitrum.io/rpc')}>Copy</span></p>
                  <p>Chain ID: <span className="text-blue-400" onClick={() => navigator.clipboard.write('421614')}>421614</span></p>
                  <button className="mt-4 px-4 py-2 bg-yellow-500 text-white rounded w-full text-lg" onClick={() => setIsModalOpen(false)}>Đóng</button>
              </Modal>
              <div className="text-center mb-8 bg-gray-800/50 p-6 rounded-lg">
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">🎰 BACCARAT P2P 🎰</h1>
                  <p className="text-sm">Arbitrum Sepolia • Blockchain • Peer-to-Peer</p>
                  {account && <p className="text-sm mt-2">Ví: {account.slice(0, 6)}...{account.slice(-4)}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                      <h4 className="text-yellow-400">💰 Tổng Pool</h4>
                      <div>{Object.values(bets).reduce((sum, bet) => sum + bet, 0)} ETH</div>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                      <h4 className="text-yellow-400">👥 Người chơi</h4>
                      <div>0</div>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                      <h4 className="text-yellow-400">⏱️ Thời gian</h4>
                      <div>30s</div>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                      <h4 className="text-yellow-400">🏠 DAO Fee</h4>
                      <div>3%</div>
                  </div>
              </div>
              <div className="bg-green-900/50 p-6 rounded-3xl border-4 border-yellow-400">
                  <div className="flex flex-col gap-4 mb-8">
                      <BetArea type="player" amount={bets.player} selected={selectedBet === 'player'} onClick={setSelectedBet} />
                      <BetArea type="tie" amount={bets.tie} selected={selectedBet === 'tie'} onClick={setSelectedBet} />
                      <BetArea type="banker" amount={bets.banker} selected={selectedBet === 'banker'} onClick={setSelectedBet} />
                  </div>
                  <div className="flex flex-col sm:flex-row justify-center gap-4 mb-4">
                      <input
                          type="number"
                          value={betAmount}
                          onChange={(e) => setBetAmount(e.target.value)}
                          placeholder="Số ETH đặt cược"
                          min="0.01"
                          step="0.01"
                          className="p-2 rounded-lg bg-gray-800 border-2 border-yellow-400 text-white w-full sm:w-auto"
                      />
                      <button onClick={placeBet} className="px-4 py-2 bg-blue-500 text-white rounded-lg w-full sm:w-auto text-lg">Đặt cược</button>
                  </div>
                  <div className="flex flex-col gap-8">
                      <div className="text-center">
                          <h3 className="text-yellow-400 mb-2">🎭 PLAYER</h3>
                          <div className="flex gap-2 overflow-x-auto">
                              {playerCards.map((card, i) => <Card key={i} card={card} flipped={true} />)}
                          </div>
                          <div className="text-yellow-400 font-bold mt-2">Điểm: {playerScore}</div>
                      </div>
                      <div className="text-center">
                          <h3 className="text-yellow-400 mb-2">🏦 BANKER</h3>
                          <div className="flex gap-2 overflow-x-auto">
                              {bankerCards.map((card, i) => <Card key={i} card={card} flipped={true} />)}
                          </div>
                          <div className="text-yellow-400 font-bold mt-2">Điểm: {bankerScore}</div>
                      </div>
                  </div>
                  <div className="text-center mt-4 p-4 rounded-lg bg-gray-800/50">{result}</div>
                  <div className="flex flex-col sm:flex-row justify-center gap-4 mt-4">
                      <button onClick={startGame} className="px-6 py-3 bg-green-500 text-white rounded-lg w-full sm:w-auto text-lg">🎯 BẮT ĐẦU</button>
                      <button onClick={() => setGameState('betting')} className="px-6 py-3 bg-orange-500 text-white rounded-lg w-full sm:w-auto text-lg">🔄 RESET</button>
                  </div>
              </div>
              <ToastContainer position="top-center" />
          </div>
      );
  }

  export default App;