

import torch
from torch import nn

class Tudui(nn.Module):
    def __init__(self):
        super(Tudui, self).__init__()
        self.conv_1 = nn.Conv2d(in_channels=3, out_channels=32,
                                kernel_size=5, stride=1, padding=2)
        # kernel_size = 2,strides = kernel_size padding = 0
        self.maxpool_1 = nn.MaxPool2d(2)
        self.conv_2 = nn.Conv2d(in_channels=32, out_channels=32,
                                kernel_size=5 ,padding=2)
        self.maxpool_2 = nn.MaxPool2d(2)
        self.conv_3 = nn.Conv2d(in_channels=32, out_channels=64,
                                kernel_size=5 ,padding=2)
        # 进入线性层
        '''
        nn.Flatten() 会做两件事：

        保留 batch 维度（如果有的话）

        将所有其他维度拉成一维  64通道4*4 --> 如果 batch_size =1 --> (1 , 1*64*4*4)
        '''
        self.flatten_1 = nn.Flatten()
        '''
        参数	你的代码中的值	含义
        in_features	64	输入特征的数量（输入向量的长度）
        out_features	32	输出特征的数量（输出向量的长度）
        '''
        # 也可以用sequential
        # self.model_1 = self.nn.sequential(
        #
        #     nn.Conv2d(in_channels=3, out_channels=32,
        #               kernel_size=5, stride=1, padding=2),
        #     nn.MaxPool2d(2),
        #     nn.Conv2d(in_channels=32, out_channels=32,
        #               kernel_size=5, padding=2),
        #     nn.MaxPool2d(2),
        #     nn.Conv2d(in_channels=32, out_channels=64,
        #               kernel_size=5, padding=2),
        #     nn.Flatten()
        # )
        self.linear_1 = nn.Linear(in_features=4096, out_features=64)
        self.linear_2 = nn.Linear(in_features=64, out_features=10)




    def forward(self, x):

        # x = self.model_1(x)
        x = self.conv_1(x)
        x = self.maxpool_1(x)
        x = self.conv_2(x)
        x = self.maxpool_2(x)
        x = self.conv_3(x)
        x = self.flatten_1(x)
        # 如果linear长度不好算，可以先跑到flatten，看输出大小
        x = self.linear_1(x)
        x = self.linear_2(x)

        return x


if __name__ == '__main__':
    model = Tudui()

    input = torch.randn(64,3,32,32)
    output = model(input)
    print(output.size())