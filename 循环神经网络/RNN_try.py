import numpy as np
from scipy.special import softmax
from utils import *   #把utils全部导入
# 单个cell的前向传播
# 两个输入 x_t, s_prev, parameters


#单个cell的前向传播
def rnn_cell_forward(x_t, s_prev ,parameters):
    '''
    
    :param x_t:  当前时刻的输入
    :param ba: 偏置
    :param s_prev:  上一层的输出
    :param parameters:  cell中的参数（U, W, ba,by, V)  字典保存权重  parameters=[U:,W:,b:,V:]
    :return:  隐藏层输出，s_next, out_pred
    
    '''
    #取出参数

    U=parameters['U']
    W=parameters['W']
    ba=parameters['ba']
    by=parameters['by']
    V=parameters['V']

# 根据公式计算
# 隐藏层输出计算  tanh是激活函数
    s_next=np.tanh(np.dot(U,x_t)+np.dot(W,s_prev)+ba)

    #计算cell的输出
    out_pred=softmax(np.dot(V,s_next)+by)

    #记录每一层的值
    cachs=(s_next,s_prev,x_t,parameters)
    return s_next, out_pred, cachs

def run_forward(x,s0,parameters):
    '''
    对所有cell进行前向传播
    :param x: 输入序列，形状(m,1,T) T是序列长度  (batch_size,channels,sequence_length)
    :param s0: 初始状态
    :param parameters:  U,W,V,ba，by权重共享
    :return: s,t,cachs
    '''
     #获取输入地N,循环对每一个cell进行前向传播
     #m是同一时刻一次处理的序列数
    batch_size,_,T=x.shape   #1复制给_,表示这个量我们没有用到
    print(batch_size)
    #获取输入的N，表示隐层输出大小状态
    m,n=parameters['V'].shape
    #获取s0的值，保存到s_next里面，以便于前向传播更新输出
    s_next=s0
    # 定义s,y保存所有隐层的输出
    s = np.zeros((n, 1, T))
    y = np.zeros((m, 1, T))
    cachs=[]
    for t in range(T):
        s_next, out_pred, cache = rnn_cell_forward(x[:,:,t],s_next,parameters)
          #放入数组当中
        s[:,:,t]=s_next
        y[:,:,t]=out_pred
       #放入所有的缓存到列表中
        cachs.append(cache)
    return s,y,cachs
def run_cell_backward(ds_next,cache):
    '''
    每个cell的右边输入梯度
    :param ds_next:s_next的梯度
    :param cache: 当前cell的缓存
    :return:  gradients 该cell6个梯度值
    '''
    #获取cell中的缓存值和参数
    (s_next,s_prev, x_t, parameters) = cache
    U = parameters['U']
    W = parameters['W']
    # ba = parameters['ba']
    # by = parameters['by']
    # V = parameters['V']
    #1.计算tanh的梯度
    dtanh=(1-s_next**2)*ds_next

    #2.计算U的梯度值
    dU=np.dot(dtanh,x_t.T)
    '''
    
    
RNN反向传播中dU = np.dot(d_tanh, x_t.T)的推导

前向传播（单时间步）：
    a_t = U * x_t + W * h_{t-1} + b
    h_t = tanh(a_t)

已知：
    dL/dh_t  (从上一层传回的梯度)

第一步：计算 dL/da_t
    dL/da_t = dL/dh_t * dh_t/da_t
    因为 h_t = tanh(a_t)，所以 dh_t/da_t = 1 - tanh^2(a_t) = 1 - h_t^2
    逐元素相乘：
    d_tanh = dL/da_t = dL/dh_t * (1 - h_t^2)

第二步：对U求梯度
    因为 a_t = U * x_t + ...，所以：
    dL/dU = dL/da_t * x_t^T
    代入d_tanh：
    dL/dU = d_tanh * x_t^T

numpy实现：
    dU = np.dot(d_tanh, x_t.T)

符号说明：
    d_tanh : 损失对a_t的梯度，已包含tanh导数，形状 (hidden_size, 1)
    x_t    : 当前时刻输入，形状 (input_size, 1)
    x_t.T  : x_t的转置，形状 (1, input_size)
    dU     : U的梯度，形状 (hidden_size, input_size)，与U相同

    
    '''
    #计算w对损失L的梯度值
    dW=np.dot(dtanh,s_prev.T)
    #4.计算ba的梯度值
    #保持计算后维度不变
    dba=np.sum(dtanh,axis=1,keepdims=True)

    #5.计算x_t对损失Loss的导数
    dx_t=np.dot(U.T,dtanh)
    #6.计算s_prev对损失值Loss的导数
    ds_prev=np.dot(W.T,dtanh)
    gradients = {'dtanh': dtanh, 'dU':dU,'dW':dW,'dba':dba,'dx_t':dx_t,'ds_prev':ds_prev}

    return gradients
'''
dU = dtanh · x_t^T

dW = dtanh · s_prev^T

dba = ∑(dtanh, axis=1)

dx_t = U^T · dtanh

ds_prev = W^T · dtanh
'''
    #把所有梯度保存到字典中返回

'''
在每个时间点 t，你都一次性传入 32 条序列在该时刻的值。
输入 x: (batch=32, channels=1, T=10)
         ↓
    [t=0] [t=1] [t=2] ... [t=9]
         ↓      ↓      ↓        ↓
     s0 → RNN → RNN → RNN ... → RNN
         ↓      ↓      ↓        ↓
        y0     y1     y2 ...   y9
         ↓      ↓      ↓        ↓
     cache0 cache1 cache2 ... cache9

输出:
- s: 所有隐藏状态 (128,1,10)
- y: 所有输出 (10,1,10)  
- cahce:
  cachs[0] 包含时间步 0 的 (s1, s0, x0, parameters)

  cachs[1] 包含时间步 1 的 (s2, s1, x1, parameters)

  cachs[t] 包含时间步 t 的 (s_{t+1}, s_t, x_t, parameters)
- cachs: [cache0, cache1, ..., cache9]


输入层(3维)       隐藏层(5个神经元)       输出层(3维)

   x0 ──────────────────────────────────────────┐
   x1 ──────────────────────────────────────────┤
   x2 ──────────────────────────────────────────┤
                                                   ↓
              ┌─────────────────────────────────────┐
              │            RNN 单元                 │
              │                                     │
              │  神经元1  ←── 权重U_1 (3个)          │
              │  神经元2  ←── 权重U_2 (3个)          │
              │  神经元3  ←── 权重U_3 (3个)          │
              │  神经元4  ←── 权重U_4 (3个)          │
              │  神经元5  ←── 权重U_5 (3个)          │
              │                                     │
              │  每个神经元也接收 W (5个权重)        │
              │  来自上一时刻的5个神经元状态         │
              │                                     │
              └─────────────────────────────────────┘
                                ↓
              ┌─────────────────────────────────────┐
              │           输出层                     │
              │                                     │
              │  类别1概率 = softmax(...)            │
              │  类别2概率 = softmax(...)            │
              │  类别3概率 = softmax(...)            │
              │                                     │
              └─────────────────────────────────────┘
'''

def rnn_backward(ds,caches):
    '''
    所有cell的反向传播
    :param ds:   所有时刻的s对对损失值Loss的梯度 假设已知的（n,1,4)
    :param cache:  保存所有中间状态
    :return:
    '''
    #取出caches当中的值
    (s1,s0,x_1,parameters) = caches[0]
    #获取输入数据的总共序列长度
    n,_,T=ds.shape
    m,_=x_1.shape
    #存储所有一次更新后的参数的梯度
    dU=np.zeros((n,m))
    dW=np.zeros((n,n))
    dba=np.zeros((n,1))

    #循环从后往前进行计算梯度
    # 初始化一个为0的前一时刻的梯度值
    ds_prevt = np.zeros((n, 1))
    #保存其他不需要更新的梯度
    dx=np.zeros((m,1,T))
    for t in reversed(range(T)):

        #下标最大是3，从3开始
        #2，1，0时刻s的梯度由两部分组成 除了对这一时刻s的梯度外，还有前一时刻返回的梯度
        gradients = run_cell_backward(ds[:,:,t]+ds_prevt,caches[t])
        ds_prevt=gradients['ds_prev']
        dU+=gradients['dU']
        dW+=gradients['dW']
        dba+=gradients['dba']
        dx[:,:,t]=gradients['dx_t']
        #返回所有更新参数的梯度以及其它变量的梯度
    gradients={'dU':dU,'dW':dW,'dba':dba,'ds_prev':ds_prevt,'dx':dx}
    return gradients
if __name__=='__main__':
     # np.random.seed(1)  #确保每次生成的随机数都是相同的
     # #定义cell输入
     # x_t=np.random.randn(3,1)
     # s_prev=np.random.randn(5,1)
     #
     # U=np.random.randn(5,3)
     # W=np.random.randn(5,5)
     # ba=np.random.randn(5,1)
     # by=np.random.randn(3,1)
     # V=np.random.randn(3,5)
     # parameters={'U':U,'W':W,'ba':ba,'by':by,'V':V}  #权重
     #
     # s_next, out_pred, cachs=rnn_cell_forward(x_t,s_prev,parameters)
     #
     # print('s_next:',s_next)   #s_next是当前状态
     # print('s_next.shape:',s_next.shape)
     # print('out_pred:',out_pred)
     # print('out_pred.shape:',out_pred.shape)
     # # out_pred 输出是3*1的列概率向量，取概率最大者为下一个输出的词
     # #权重矩阵V连接s_next和out_pred s_next大小取决于具体需求
     #forward测试
     # np.random.seed(1)
     # x=np.random.randn(3,1,4)
     # s0=np.random.randn(5,1)
     # W=np.random.randn(5,5)
     # U=np.random.randn(5,3)
     # V=np.random.randn(3,5)
     # ba=np.random.randn(5,1)
     # by=np.random.randn(3,1)
     # parameters={'U':U,'W':W,'V':V,'ba':ba,'by':by}
     # s,y,cachs=run_forward(x,s0,parameters)
     # print('s:',s)
     # print('y:',y)
     # print('cachs:',cachs)
     #backword
     np.random.seed(1)
     #定义了4个cell，每一个大小为(3,1)
     x=np.random.randn(3,1,4)
     s0=np.random.randn(5,1)
     W=np.random.randn(5,5)
     U=np.random.randn(5,3)
     V=np.random.randn(3,5)
     ba=np.random.randn(5,1)
     by=np.random.randn(3,1)
     parameters={'x':x,'s0':s0,'W':W,'U':U,'V':V,'ba':ba,'by':by}
     s,t,caches=run_forward(x,s0,parameters)
     #随机给一个四个cell输出的导数结果
     ds=np.random.randn(5,1,4)
     gradients=rnn_backward(ds,caches)
     print(gradients)

'''
x (输入)              dx (梯度)
shape (3,1,4)        shape (3,1,4)

特征0: [a0, a1, a2, a3]  ←→  [∂L/∂a0, ∂L/∂a1, ∂L/∂a2, ∂L/∂a3]
特征1: [b0, b1, b2, b3]  ←→  [∂L/∂b0, ∂L/∂b1, ∂L/∂b2, ∂L/∂b3]  
特征2: [c0, c1, c2, c3]  ←→  [∂L/∂c0, ∂L/∂c1, ∂L/∂c2, ∂L/∂c3]
'''

'''

输入层          隐藏层           输出层
(3维) 3个词      (5维)           (3维)

x_t (3,1)      s_prev (5,1)    out_pred (3,1)
    ↓              ↓                ↑
    ↓         ┌────┴────┐           │
    └────────→│   RNN   ├───────────┘
              │   Cell  │
    ┌────────→│         │
    ↓         └────┬────┘
U (5,3)           W (5,5)         V (?,5)

公式：
s_next = tanh( U·x_t + W·s_prev + ba )
out_pred = softmax( V·s_next + by )


'''





