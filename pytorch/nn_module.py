import torch
import torch.nn as nn

#nn.module是pytorch中所有神经网络的基类继承后，
# 你的类就拥有了神经网络的所有基本功能（参数管理、训练模式、设备转移等）

class Tudui(nn.Module):
    #在这里定义网络的层结构（卷积层、全连接层等）
    '''
    含义：调用父类 nn.Module 的构造函数
    为什么必须写：确保父类的初始化逻辑被执行，否则网络无法正常工作
    super() 是 Python 中用于调用父类方法的内置函数，在面向对象编程中非常常用。
    '''

    def __init__(self):
        super().__init__()

    def forward(self,input):
        output=input+1
        return output


tudui = Tudui()

x = torch.tensor(1.0) #一维的张量  就是个标量

#网络会有一个输出
output = tudui(x)

print(output)