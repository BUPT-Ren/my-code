import numpy as np
from PIL import Image
from torch.utils.tensorboard import SummaryWriter
from torchvision import transforms


img_path = 'data/train/ants_image/0013035.jpg'

writer = SummaryWriter('logs')

img = Image.open(img_path)

trans_totensor = transforms.ToTensor()
# ToTensor 会将 [0,255] 的像素值除以 255，得到 [0,1] 范围
tensor_img = trans_totensor(img)

writer.add_image('tensor_img',tensor_img,global_step=1)

#归一化 Normalize  (均值,标准差)
'''
通道数必须匹配：mean 和 std 的长度必须等于图像的通道数

RGB 图像（3通道）：需要 3 个值

灰度图像（1通道）：需要 1 个值
'''
#output = (input - mean) / std  这里实现从：[0,1]转换为[-1,1]
#这是深度学习中非常常用的预处理方式，因为神经网络通常喜欢均值为 0、范围在 [-1,1] 的输入数据。
#这是为了防范参数更新出现梯度消失或梯度下降的情况
'''
∂L/∂w₁ = 2(y - ŷ) · x₁ 梯度大小和输入的数据大小直接相关
∂L/∂w₂ = 2(y - ŷ) · x₂ 防范有的参数更新快有的更新慢
'''

#normalize
#输出tensor_img的第一个像素值
print(tensor_img[0][0][0])
trans_norm = transforms.Normalize([0.5,0.5,0.5],[0.5,0.5,0.5])
img_norm = trans_norm(tensor_img)

print(img_norm[0][0][0])
writer.add_image('img_norm',img_norm,global_step=1)

#resize  必须传入PIL
print(img)# 查看PIL图片的尺寸
trans_resize = transforms.Resize([512,512])
img_resize = trans_resize(img)
print(img_resize)
img_resize_array = np.array(img_resize)
writer.add_image('img_resize',img_resize_array,global_step=1,dataformats='HWC')

#compose-resize 2
#Comepose中的参数是一个列表，数据必须是transform类型（tensor，ndarrray，IPL...) [transforms_1,transforms_2,transforms_3]
'''
Compose 的核心要点
参数必须是列表（或元组），不能是多个单独的参数

列表中的元素必须是可调用的变换对象（transform类型）

数据要求：输入数据可以是 tensor、ndarray、PIL Image 等

执行顺序：按列表中的顺序依次应用变换
'''
trans_resize_2 = transforms.Resize(512)
#PIL-->resize-->512*512 PIL-->toTensor Tensor 类型 要注意Compose的前后输入是否匹配
trans_compose = transforms.Compose([trans_resize_2,trans_totensor])
#这里是先resize然后再Totensor
img_resize_2 = trans_compose(img)
writer.add_image('img_resize_2',img_resize_2,global_step=1)

#Random_crop

trans_random = transforms.RandomCrop(512)
trans_compose_2 = transforms.Compose([trans_random,trans_totensor])
for i in range(10):
    img_crop = trans_compose_2(img)
    print(img_crop.shape)
    writer.add_image('random_crop',img_crop,global_step=i)
writer.close()
#关注输入输出类型  各种官方文档  关注方法需要什么参数
