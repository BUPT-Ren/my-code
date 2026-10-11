
import torch
from torch import nn
from torch.nn import L1Loss,MSELoss,CrossEntropyLoss
inputs = torch.tensor([1,2,3])
targets = torch.tensor([1,2,5])

inputs = torch.reshape(inputs,(1,1,1,3))

targets = torch.reshape(targets,(1,1,1,3))

#reduction = 'mean' reduction = 'sum'
# loss = L1Loss(reduction='sum')
# result = loss(inputs.float(),targets.float())
# print(result)

#MSELoss

# loss_mse = MSELoss()
#
# result_mse = loss_mse(inputs.float(),targets.float())
# print(result_mse)

x = torch.tensor([0.1,0.2,0.3])  #shape([3])
x =torch.reshape(x,(1,3))  #shape([1,3])
#正确答案是类别 1
y = torch.tensor([1])
loss_cross = nn.CrossEntropyLoss()

result_cross = loss_cross(x,y)

'''
取对数：
预测情况	损失值	说明
完美预测	接近 0	模型对真实类别的概率接近 1
正确但不够自信	> 0	如概率 0.7 → loss ≈ 0.36
预测错误	可能很大	如真实概率 0.01 → loss ≈ 4.6
极度错误	非常大	如真实概率 1e-6 → loss ≈ 13.8

'''
print(result_cross)